import { NextRequest, NextResponse } from 'next/server';
import { verifyB2BKey } from '@/lib/b2b-auth';
import { db } from '@/lib/db';
import { marketingService } from '@/services/marketing.service';

/**
 * B2B API: Create order using prepaid balance (standard SMM panel API).
 * Different from web checkout — B2B clients have API keys and balance.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action');
    const key = formData.get('key');

    if (action !== 'add') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const user = await verifyB2BKey(key?.toString());
    if (!user) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const serviceId = formData.get('service')?.toString();
    const link = formData.get('link')?.toString();
    const quantity = parseInt(formData.get('quantity')?.toString() || '0', 10);
    const runs = formData.get('runs') ? parseInt(formData.get('runs')?.toString() as string, 10) : undefined;
    const interval = formData.get('interval') ? parseInt(formData.get('interval')?.toString() as string, 10) : undefined;

    if (!serviceId || !link || quantity <= 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Calculate price
    const pricing = await marketingService.calculatePrice(user.id, serviceId, quantity);

    // Atomic balance deduction + order creation
    const orderId = await db.$transaction(async (tx) => {
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
          serviceId,
          link,
          quantity,
          status: 'PENDING', // B2B orders are already paid via balance
          charge: pricing.totalCents,
          providerCost: pricing.providerCostCents,
          remains: quantity,
          runs,
          interval,
          isDripFeed: (runs && runs > 1) ? true : false,
          nextRunAt: (runs && runs > 1) ? new Date() : null
        }
      });

      return newOrder.id;
    });

    return NextResponse.json({ order: orderId });
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
    }
    console.error('B2B API Order Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
