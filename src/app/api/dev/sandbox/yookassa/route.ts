import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/services/financial/payment.service';

export async function POST(req: NextRequest) {
  try {
    const { userId, amount } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: 'Missing userId or amount' }, { status: 400 });
    }

    // Dev Sandbox double-check will instantly approve and credit the user
    const success = await paymentService.createDevSandboxPayment(userId, amount);

    if (success) {
      return NextResponse.json({ success: true, message: 'Dev Sandbox Payment Succeeded' }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Sandbox Payment failed' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Dev Sandbox Error:', error.message);
    return NextResponse.json({ error: 'Sandbox Error' }, { status: 500 });
  }
}
