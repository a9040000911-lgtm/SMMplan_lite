import { NextRequest, NextResponse } from 'next/server';
import { verifyB2BKey } from '@/lib/b2b-auth';
import { checkoutCore } from '@/actions/order/checkout';

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

    // Call internal checkout core
    try {
      const result = await checkoutCore(user.id, serviceId, link, quantity, undefined, runs, interval);
      
      if (result.success && result.orderId) {
        return NextResponse.json({ order: result.orderId });
      } else {
        return NextResponse.json({ error: result.error || 'Failed to place order' }, { status: 400 });
      }
    } catch (checkoutError: any) {
      if (checkoutError.message === 'INSUFFICIENT_FUNDS') {
        return NextResponse.json({ error: 'Not enough funds on balance' }, { status: 400 });
      }
      return NextResponse.json({ error: checkoutError.message || 'Internal logic error' }, { status: 500 });
    }

  } catch (error) {
    console.error('B2B API Order Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
