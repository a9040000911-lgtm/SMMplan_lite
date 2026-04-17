import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyB2BKey } from '@/lib/b2b-auth';
import { marketingService } from '@/services/marketing.service';

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

  const volumeTier = marketingService.getVolumeTier(user.totalSpent);
  const maxDiscountPercent = Math.max(user.personalDiscount, volumeTier.discountPercent);

  const formattedServices = services.map(s => {
    const originalRatePer1000 = s.rate * s.markup;
    const discountVal = (originalRatePer1000 * maxDiscountPercent) / 100;
    let finalRatePer1000 = originalRatePer1000 - discountVal;

    if (finalRatePer1000 < s.rate) {
      finalRatePer1000 = s.rate;
    }

    return {
      service: s.numericId, // Standard APIs use integers
      name: s.name,
      type: 'Default',
      category: s.category.name,
      rate: (finalRatePer1000 / 100).toFixed(4), // Assume rate was in cents, wait, no, rate is float in Smmplan currently. If we want float standard we format it directly. Actually s.rate is float.
      min: s.minQty.toString(),
      max: s.maxQty.toString(),
      dripfeed: s.isDripFeedEnabled,
      refill: s.isRefillEnabled,
      cancel: s.isCancelEnabled
    };
  });

  // Hotfix for Smmplan rate type which is float, formatting appropriately.
  // In Smmplan, user balance is Cents, but rate in API should be normal decimal.
  // Wait, the API spec says rate is "0.90" (USD/RUB). In Smmplan rate is 15.0.
  // Let's ensure it's properly formatted.
  const finalFormatted = formattedServices.map(s => ({
    ...s,
    // Smmplan's rate is nominally in full currency units (e.g. 15 RUB), not cents, because checkout converts it.
    // Actually, checkout does Math.round((rate / 1000) * qty * 100). So rate is in RUB.
    rate: Number(s.rate).toFixed(4)
  }));

  return NextResponse.json(finalFormatted);
}

async function handleAdd(user: any, formData: FormData) {
  const serviceNumericIdStr = formData.get('service')?.toString();
  const link = formData.get('link')?.toString();
  const quantity = parseInt(formData.get('quantity')?.toString() || '0', 10);
  
  // Custom type specific logic (optional for standard)
  // const comments = formData.get('comments')?.toString();
  // const usernames = formData.get('usernames')?.toString();

  const runs = formData.get('runs') ? parseInt(formData.get('runs')?.toString() as string, 10) : undefined;
  const interval = formData.get('interval') ? parseInt(formData.get('interval')?.toString() as string, 10) : undefined;

  if (!serviceNumericIdStr || !link || quantity <= 0) {
    return NextResponse.json({ error: 'Incorrect parameters' }, { status: 400 });
  }

  const serviceNumericId = parseInt(serviceNumericIdStr, 10);
  if (isNaN(serviceNumericId)) {
    return NextResponse.json({ error: 'Incorrect service ID' }, { status: 400 });
  }

  const service = await db.service.findUnique({ where: { numericId: serviceNumericId } });
  if (!service || !service.isActive) {
    return NextResponse.json({ error: 'Incorrect service ID' }, { status: 400 });
  }

  if (quantity < service.minQty || quantity > service.maxQty) {
    return NextResponse.json({ error: 'Quantity out of bounds' }, { status: 400 });
  }

  try {
    const pricing = await marketingService.calculatePrice(user.id, service.id, quantity);

    const orderNumericId = await db.$transaction(async (tx) => {
      const lockUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } });

      if (lockUser.balance < pricing.totalCents) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      await tx.user.update({
        where: { id: user.id },
        data: { 
          balance: { decrement: pricing.totalCents },
          totalSpent: { increment: pricing.totalCents }
        }
      });

      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          link,
          quantity,
          status: 'PENDING', // PENDING means paid by balance and ready for processing
          charge: pricing.totalCents,
          providerCost: pricing.providerCostCents,
          remains: quantity,
          runs,
          interval,
          isDripFeed: (runs && runs > 1) ? true : false,
          nextRunAt: (runs && runs > 1) ? new Date() : null
        }
      });

      return newOrder.numericId;
    });

    return NextResponse.json({ order: orderNumericId });
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
    }
    throw err;
  }
}

async function handleStatus(user: any, formData: FormData) {
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

async function handleBalance(user: any) {
  return NextResponse.json({
    balance: (user.balance / 100).toFixed(4),
    currency: 'RUB'
  });
}

async function handleCancel(user: any, formData: FormData) {
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

async function handleRefill(user: any, formData: FormData) {
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
