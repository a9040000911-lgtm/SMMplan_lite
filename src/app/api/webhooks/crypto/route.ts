import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('crypto-pay-api-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const payload = await request.text();
    const CRYPTO_BOT_TOKEN = process.env.CRYPTO_BOT_TOKEN || 'test_token';

    // Verify CryptoBot Signature
    const secret = crypto.createHash('sha256').update(CRYPTO_BOT_TOKEN).digest();
    const checkString = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (checkString !== signature) {
       console.error('[Webhook] Invalid CryptoBot signature');
       return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(payload);
    
    // We only care about successfully paid invoices
    if (data.update_type === 'invoice_paid') {
      const invoice = data.payload;
      const gatewayId = invoice.invoice_id.toString();

      // Atomic Update to prevent concurrent Race Condition double-spends
      await db.$transaction(async (tx) => {
        // 1. Fetch exact payment to get the amount and userId
        const existingPayment = await tx.payment.findUnique({
          where: { gatewayId }
        });

        if (!existingPayment) {
           throw new Error('Payment not found');
        }

        // 2. Try to shift status atomically from PENDING to SUCCEEDED
        const { count } = await tx.payment.updateMany({
          where: { id: existingPayment.id, status: 'PENDING' },
          data: { status: 'SUCCEEDED' }
        });

        if (count === 0) {
           // Either already succeeded or canceled. Idempotency triggered.
           return;
        }

        // 3. Since count === 1, it was pending and we successfully shifted it. We can safely add balance.
        await tx.user.update({
          where: { id: existingPayment.userId },
          data: { balance: { increment: existingPayment.amount } }
        });
      });

      console.log(`[Webhook] Successfully processed payment ${gatewayId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
