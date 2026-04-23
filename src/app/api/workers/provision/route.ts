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

  // 2. Fetch Pending Orders (Limit 50 to avoid lambda timeouts)
  const pendingOrders = await db.order.findMany({
    where: { status: 'PENDING', isDripFeed: false },
    take: 50,
    include: { service: true },
    orderBy: { createdAt: 'asc' }
  });

  if (pendingOrders.length === 0) {
    return NextResponse.json({ message: 'No pending orders to provision.' });
  }

  let processed = 0;
  let failed = 0;

  // 3. Process sequentially
  for (const order of pendingOrders) {
    try {
      // ATOMIC LOCK: Try to claim the order for processing
      const lock = await db.order.updateMany({
         where: { id: order.id, status: 'PENDING' },
         data: { status: 'PROVISIONING' }
      });
      if (lock.count === 0) continue; // Another worker claimed it

      const provider = await providerService.getDefaultProvider();
      
      if (!order.service?.externalId) {
         throw new Error(`Service has no external ID mapped.`);
      }

      const res = await provider.createOrder(
        order.service.externalId, 
        order.link, 
        order.quantity, 
        order.runs || undefined, 
        order.interval || undefined
      );

      if (res.success && res.externalId) {
        await db.order.update({
          where: { id: order.id },
          data: { 
            externalId: res.externalId,
            status: 'IN_PROGRESS'
          }
        });
        processed++;
      } else {
        const newRetryCount = (order.retryCount || 0) + 1;
        const isFatal = newRetryCount >= 3;

        if (isFatal) {
          await db.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: { 
                error: res.error || 'Failed to submit to provider (FATAL)',
                retryCount: newRetryCount,
                status: 'ERROR'
              }
            });
            await tx.user.update({
              where: { id: order.userId },
              data: { 
                balance: { increment: order.charge },
                totalSpent: { decrement: order.charge }
              }
            });
          });
        } else {
          await db.order.update({
            where: { id: order.id },
            data: { 
              error: res.error || 'Failed to submit to provider',
              retryCount: newRetryCount,
              status: 'PENDING'
            }
          });
        }
        failed++;
      }
    } catch (e: any) {
      console.error(`Error provisioning order ${order.id}:`, e);
      
      const newRetryCount = (order.retryCount || 0) + 1;
      const isFatal = newRetryCount >= 3;

      if (isFatal) {
        await db.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { error: String(e.message || 'Worker Exception (FATAL)'), retryCount: newRetryCount, status: 'ERROR' }
          });
          await tx.user.update({
            where: { id: order.userId },
            data: { balance: { increment: order.charge }, totalSpent: { decrement: order.charge } }
          });
        });
      } else {
        await db.order.update({
          where: { id: order.id },
          data: { error: String(e.message || 'Worker Exception'), retryCount: newRetryCount, status: 'PENDING' }
        });
      }

      failed++;
    }
  }

  return NextResponse.json({
    message: `Provision complete`,
    details: {
      totalFound: pendingOrders.length,
      processedSuccessfully: processed,
      failedToProcess: failed
    }
  });
}
