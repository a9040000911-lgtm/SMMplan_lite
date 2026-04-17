import { NextRequest, NextResponse } from 'next/server';
import { orderSyncWorker } from '@/actions/order/sync-worker';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  // Hardcoded simple check or rely on Vercel CRON_SECRET
  // In Vercel, cron jobs send: Authorization: Bearer process.env.CRON_SECRET
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
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
