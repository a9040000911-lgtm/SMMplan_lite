export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { orderSyncWorker } from '@/actions/order/sync-worker';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // CRON_SECRET is MANDATORY — reject if not configured or mismatch
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await orderSyncWorker.runAllCycles();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('CRON failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

