import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';

export async function GET(request: Request) {
  // 1. Verify Authentication 
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'dev_secret';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch In Progress Orders (Limit iteration to avoid timeouts)
  const activeOrders = await db.order.findMany({
    where: { status: 'IN_PROGRESS', externalId: { not: null } },
    take: 50,
  });

  if (activeOrders.length === 0) {
    return NextResponse.json({ message: 'No active orders to sync.' });
  }

  const provider = await providerService.getDefaultProvider();
  
  let completed = 0;
  let partial = 0;
  let canceled = 0;
  let unchanged = 0;

  for (const order of activeOrders) {
    try {
      const syncObject = await provider.getStatus(order.externalId!);

      if (syncObject.status === 'COMPLETED') {
        await db.order.update({
          where: { id: order.id },
          data: { status: 'COMPLETED', remains: 0 }
        });
        completed++;
      } 
      else if (syncObject.status === 'CANCELED') {
        // Full Refund Transaction
        await db.$transaction(async (tx) => {
          await tx.user.update({
             where: { id: order.userId },
             data: { balance: { increment: order.charge } }
          });
          await tx.order.update({
             where: { id: order.id },
             data: { status: 'CANCELED', remains: order.quantity }
          });
        });
        canceled++;
      }
      else if (syncObject.status === 'PARTIAL') {
         // Partial Refund Transaction
         const remains = syncObject.remains || 0;
         const refundFraction = remains / order.quantity; // e.g. 50/100 = 0.5
         const refundCents = Math.floor(order.charge * refundFraction);
         
         await db.$transaction(async (tx) => {
            await tx.user.update({
               where: { id: order.userId },
               data: { balance: { increment: refundCents } }
            });
            await tx.order.update({
               where: { id: order.id },
               data: { status: 'PARTIAL', remains }
            });
         });
         partial++;
      }
      else {
        // PENDING or IN_PROGRESS (just update remains)
        if (syncObject.remains !== undefined) {
           await db.order.update({
             where: { id: order.id },
             data: { remains: syncObject.remains }
           });
        }
        unchanged++;
      }
    } catch (e) {
      console.error(`Failed to sync order ${order.id}:`, e);
    }
  }

  return NextResponse.json({
    message: 'Status sync complete',
    details: {
      totalFound: activeOrders.length,
      completed, partial, canceled, unchanged
    }
  });
}
