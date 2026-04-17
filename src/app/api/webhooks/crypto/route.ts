import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { paymentService } from '@/services/financial/payment.service';

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
      // The payment logic has been centralized. We use confirmPayment.
      // We pass `invoice.payload` as it contains our internal `paymentId` due to checkout.ts mapping it.
      // But confirmPayment currently expects `gatewayId` (the invoice ID).
      const gatewayId = invoice.invoice_id.toString();
      const amount = Math.round(parseFloat(invoice.amount || '0') * 100);

      const success = await paymentService.confirmPayment(gatewayId, amount, invoice.payload /* userId map isn't needed here if we match by gatewayId, but we can pass it if we parse payload */, false);

      if (!success) {
         return NextResponse.json({ error: 'Payment double-check validation failed' }, { status: 400 });
      }

      console.log(`[Webhook] Successfully processed payment ${gatewayId}`);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
