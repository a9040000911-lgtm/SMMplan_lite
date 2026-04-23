import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { paymentService } from '@/services/financial/payment.service';
import { SettingsManager } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('crypto-pay-api-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const payload = await request.text();
    const secrets = await SettingsManager.getPaymentSecrets();
    const CRYPTO_BOT_TOKEN = secrets.cryptoBotToken || 'test_token';

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
      const paymentId = invoice.payload;
      const payment = await db.payment.findUnique({ where: { id: paymentId } });
      
      if (!payment) {
         console.error(`[Webhook] Payment record not found for payload ${paymentId}`);
         // Can't confirm without knowing the userId for the orphan fallback/promo logic
         return NextResponse.json({ error: 'Payment context missing' }, { status: 400 });
      }

      const gatewayId = invoice.invoice_id.toString();
      
      // Strict Integer parsing complying with IEEE 754 financial rules
      const rawAmountStr = String(invoice.amount || '0.00');
      const [intPart, decPart] = rawAmountStr.split('.');
      const amount = parseInt(intPart || '0', 10) * 100 + parseInt((decPart || '00').padEnd(2, '0').slice(0, 2), 10);

      const success = await paymentService.confirmPayment(
        gatewayId, 
        amount, 
        payment.userId, // Real userId retrieved from db, NOT the paymentId
        false,
        'cryptobot',
        payment.id // Prevent orphan race condition
      );

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
