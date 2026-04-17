import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';
import { db } from '@/lib/db';

/**
 * Dev Sandbox: Simulate a YooKassa balance top-up for testing.
 * Creates a Payment + credits user balance directly.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, amount } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: 'Missing userId or amount' }, { status: 400 });
    }

    const fakeGatewayId = `dev_yookassa_${Date.now()}`;
    const amountCents = Math.round(amount * 100);

    // Create payment record and credit balance directly
    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: 'RUB',
          status: 'SUCCEEDED',
          gatewayId: fakeGatewayId,
          gateway: 'test'
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountCents } }
      });
    });

    return NextResponse.json({ success: true, message: 'Dev Sandbox Payment Succeeded' }, { status: 200 });
  } catch (error: any) {
    console.error('Dev Sandbox Error:', error.message);
    return NextResponse.json({ error: 'Sandbox Error' }, { status: 500 });
  }
}
