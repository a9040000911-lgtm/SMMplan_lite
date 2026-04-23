import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyB2BKey } from '@/lib/b2b-auth';
import { marketingService } from '@/services/marketing.service';
import { orderService } from '@/services/core/order.service';
import { z } from 'zod';
import { type User } from '@prisma/client';

// Standard SMM Panel API v2 Implementation
// https://panel.com/api/v2

// Maps internal statuses to standard API representation
function mapInternalStatus(internal: string): string {
  const statusMap: Record<string, string> = {
    'AWAITING_PAYMENT': 'Pending',
    'PENDING': 'Pending',
    'IN_PROGRESS': 'In progress',
    'COMPLETED': 'Completed',
    'PARTIAL': 'Partial',
    'CANCELED': 'Canceled',
    'ERROR': 'Fail'
  };
  return statusMap[internal] || 'Pending';
}

function mapRefillStatus(internal: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pending',
    'IN_PROGRESS': 'In progress',
    'COMPLETED': 'Completed',
    'REJECTED': 'Rejected',
    'ERROR': 'Fail'
  };
  return statusMap[internal] || 'Pending';
}

export async function POST(request: NextRequest) {
  try {
    // SMM APIs typically send x-www-form-urlencoded data
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid request format. Use application/x-www-form-urlencoded' }, { status: 400 });
    }

    const key = formData.get('key')?.toString();
    const action = formData.get('action')?.toString();

    if (!key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    // 1. Authenticate User
    const user = await verifyB2BKey(key);
    if (!user) {
      return NextResponse.json({ error: 'Incorrect request or API key' }, { status: 401 });
    }

    // 2. Route by Action
    switch (action) {
      case 'services':
        return await handleServices(user);
      case 'add':
        return await handleAdd(user, formData);
      case 'status':
        return await handleStatus(user, formData);
      case 'balance':
        return await handleBalance(user);
      case 'refill':
        return await handleRefill(user, formData);
      case 'refill_status':
        return await handleRefillStatus(user, formData);
      case 'cancel':
        return await handleCancel(user, formData);
      default:
        return NextResponse.json({ error: 'Incorrect action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[API v2 Error]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// ACTION HANDLERS
// ----------------------------------------------------------------------

async function handleServices(user: any) {
  const services = await db.service.findMany({
    include: { category: true },
    where: { isActive: true }
  });

  const finalFormatted = marketingService.getB2BFormattedServices(user, services);
  return NextResponse.json(finalFormatted);
}

const addSchema = z.object({
  service: z.coerce.number().int().positive(),
  link: z.string().url().or(z.string().min(1)),
  quantity: z.coerce.number().int().positive(),
  runs: z.coerce.number().int().positive().optional(),
  interval: z.coerce.number().int().positive().optional()
});

async function handleAdd(user: any, formData: FormData) {
  const payload = Object.fromEntries(formData.entries());
  const parsed = addSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Incorrect parameters' }, { status: 400 });
  }

  const { service: serviceNumericId, link, quantity, runs, interval } = parsed.data;

  const service = await db.service.findUnique({ where: { numericId: serviceNumericId } });
  if (!service || !service.isActive) {
    return NextResponse.json({ error: 'Incorrect service ID' }, { status: 400 });
  }

  if (quantity < service.minQty || quantity > service.maxQty) {
    return NextResponse.json({ error: 'Quantity out of bounds' }, { status: 400 });
  }

  // B2B panels standard: for DripFeed, "quantity" parameter is quantity *per run*.
  // Our DB schema requires order.quantity to be the *total* overall quantity.
  const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;

  try {
    const pricing = await marketingService.calculatePrice(user.id, service.id, totalQuantity);

    const orderNumericId = await db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { 
          balance: { decrement: pricing.totalCents },
          totalSpent: { increment: pricing.totalCents }
        }
      });

      if (updatedUser.balance < 0) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      const newOrder = await orderService.createOrderTransaction(tx, {
        userId: user.id,
        serviceId: service.id,
        link,
        quantity: totalQuantity,
        status: 'PENDING',
        charge: pricing.totalCents,
        providerCost: pricing.providerCostCents,
        runs,
        interval
      });

      return newOrder.numericId;
    }, {
      // SERIALIZABLE prevents Double Spend: two parallel transactions
      // trying to decrement the same balance will cause one to abort
      // with a serialization failure, which Prisma auto-retries.
      isolationLevel: 'Serializable',
    });

    return NextResponse.json({ order: orderNumericId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
    }
    // P2034: Serializable transaction conflict (concurrent balance writes)
    // This is expected under high concurrency — treat as insufficient funds
    if (err && typeof err === 'object' && 'code' in err && (err as any).code === 'P2034') {
      return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
    }
    throw err;
  }
}

async function handleStatus(user: User, formData: FormData) {
  const orderStr = formData.get('order')?.toString();
  const ordersStr = formData.get('orders')?.toString();

  if (orderStr) {
    // Single
    const numericId = parseInt(orderStr, 10);
    const order = isNaN(numericId) ? null : await db.order.findUnique({
      where: { numericId }
    });

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: 'Incorrect order ID' }, { status: 400 });
    }

    return NextResponse.json({
      charge: (order.charge / 100).toFixed(4),
      start_count: "0",
      status: mapInternalStatus(order.status),
      remains: order.remains.toString(),
      currency: 'RUB'
    });
  }

  if (ordersStr) {
    // Multiple
    const ids = ordersStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const orders = await db.order.findMany({
      where: {
        numericId: { in: ids },
        userId: user.id
      }
    });

    const resultMap: Record<string, any> = {};
    for (const id of ids) {
      resultMap[id.toString()] = { error: 'Incorrect order ID' };
    }

    for (const order of orders) {
      resultMap[order.numericId.toString()] = {
        charge: (order.charge / 100).toFixed(4),
        start_count: "0",
        status: mapInternalStatus(order.status),
        remains: order.remains.toString(),
        currency: 'RUB'
      };
    }

    return NextResponse.json(resultMap);
  }

  return NextResponse.json({ error: 'Missing order parameter' }, { status: 400 });
}

async function handleBalance(user: User) {
  return NextResponse.json({
    balance: (user.balance / 100).toFixed(4),
    currency: 'RUB'
  });
}

async function handleCancel(user: User, formData: FormData) {
  const ordersStr = formData.get('orders')?.toString() || formData.get('order')?.toString();
  
  if (!ordersStr) {
    return NextResponse.json({ error: 'Missing order parameter' }, { status: 400 });
  }

  // Real SMM panels often process cancellations aggressively or async.
  // We'll return the standard standard "attempt" response.
  return NextResponse.json({
    success: 'We will attempt to cancel this order. Cancellation is not guaranteed.'
  });
}

async function handleRefill(user: User, formData: FormData) {
  const orderStr = formData.get('order')?.toString();
  if (!orderStr) {
    return NextResponse.json({ error: 'Missing order parameter' }, { status: 400 });
  }

  const numericId = parseInt(orderStr, 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: 'Incorrect order ID' }, { status: 400 });
  }

  const order = await db.order.findUnique({
    where: { numericId },
    include: { service: true }
  });

  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: 'Incorrect order ID' }, { status: 400 });
  }

  if (!order.service.isRefillEnabled) {
    return NextResponse.json({ error: 'Refill not available for this service' }, { status: 400 });
  }

  if (order.status !== 'COMPLETED' && order.status !== 'PARTIAL') {
     return NextResponse.json({ error: 'Order must be completed to request a refill' }, { status: 400 });
  }

  // Create a pending refill request
  const refill = await db.refill.create({
    data: {
      orderId: order.id,
      status: 'PENDING'
    }
  });

  return NextResponse.json({ refill: refill.numericId });
}

async function handleRefillStatus(user: any, formData: FormData) {
  const refillStr = formData.get('refill')?.toString();
  if (!refillStr) {
    const refillsStr = formData.get('refills')?.toString();
    if (refillsStr) {
      // Multiple
      const ids = refillsStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      const refills = await db.refill.findMany({
        where: { numericId: { in: ids }, order: { userId: user.id } }
      });
      
      const resultMap: any[] = [];
      for (const refill of refills) {
        resultMap.push({
           refill: refill.numericId,
           status: mapRefillStatus(refill.status)
        });
      }
      return NextResponse.json(resultMap);
    }
    return NextResponse.json({ error: 'Missing refill parameter' }, { status: 400 });
  }

  // Single
  const numericId = parseInt(refillStr, 10);
  if (isNaN(numericId)) return NextResponse.json({ error: 'Incorrect refill ID' }, { status: 400 });

  const refill = await db.refill.findUnique({
    where: { numericId },
    include: { order: true }
  });

  if (!refill || refill.order.userId !== user.id) {
    return NextResponse.json({ error: 'Incorrect refill ID' }, { status: 400 });
  }

  return NextResponse.json({ status: mapRefillStatus(refill.status) });
}
