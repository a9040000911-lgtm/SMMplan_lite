import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';

/**
 * Mock Payment Endpoint — simulates a payment gateway confirmation.
 * Only works in test mode. Called via redirect from checkout.
 * 
 * GET /api/dev/mock-payment?paymentId=xxx
 */
export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
  }

  try {
    const success = await paymentService.confirmPaymentById(paymentId);

    if (success) {
      // Redirect to success page
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/order/success?paymentId=${paymentId}`);
    }

    return NextResponse.json({ error: 'Payment confirmation failed' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
