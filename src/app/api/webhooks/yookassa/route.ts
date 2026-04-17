import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || '';
    
    // Simplistic YooKassa IP whitelist check
    const isYooKassa = ['185.71.76.', '185.71.77.', '77.75.153.', '77.75.154.', '77.75.156.', '2a02:5180'].some(prefix => ip.includes(prefix));
    
    // In dev we bypass, in Prod we strictly deny unauthorized IPs
    if (!isYooKassa && process.env.NODE_ENV === 'production') {
       console.error(`[Webhook] Unrecognized YooKassa IP: ${ip}`);
       return NextResponse.json({ error: 'Unauthorized IP' }, { status: 403 });
    }

    const rawBody = await req.json();
    
    // YooKassa Webhook Payload Example:
    // { type: 'notification', event: 'payment.succeeded', object: { id: '2abc', amount: { value: '100.00' }, metadata: { userId: '123' } } }
    
    if (rawBody.event === 'payment.succeeded' && rawBody.object) {
      const gatewayId = rawBody.object.id;
      const amount = Math.round(parseFloat(rawBody.object.amount?.value || '0') * 100);
      const userId = rawBody.object.metadata?.userId;

      if (!userId || !gatewayId) {
        return NextResponse.json({ error: 'Missing userId or gatewayId in metadata' }, { status: 400 });
      }

      // Safe confirmation using Double-Check Logic
      const success = await paymentService.confirmPayment(gatewayId, amount, userId, false);

      if (success) {
        return NextResponse.json({ success: true, status: 'Payment processed strictly' }, { status: 200 });
      } else {
        return NextResponse.json({ error: 'Payment double-check validation failed' }, { status: 400 });
      }
    }

    return NextResponse.json({ status: 'Ignored unsupported event' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
