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

  const now = new Date();

  // 2. Fetch Drip-Feed Orders ready for action
  const readyOrders = await db.order.findMany({
    where: { 
      isDripFeed: true,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      nextRunAt: { lte: now }
    },
    take: 20, // Process in small batches
    include: { service: true },
    orderBy: { nextRunAt: 'asc' }
  });

  if (readyOrders.length === 0) {
    return NextResponse.json({ message: 'No drip-feed scheduled.' });
  }

  let processed = 0;
  let failed = 0;

  for (const order of readyOrders) {
    try {
      if (!order.runs || !order.interval) continue;
      
      if (order.currentRun >= order.runs) {
         // Should be finished, safety catch
         continue;
      }

      // ATOMIC LOCK: Optimistic concurrency using nextRunAt
      const tempLockDate = new Date(Date.now() + 5 * 60000); // 5 min lock
      const lock = await db.order.updateMany({
         where: { id: order.id, nextRunAt: order.nextRunAt },
         data: { nextRunAt: tempLockDate }
      });
      if (lock.count === 0) continue; // Another worker is processing this chunk

      // Check overlap: If it's IN_PROGRESS and has an externalId, wait.
      // Smmplan_lite sync-status will clear it to COMPLETED if the previous chunk finished.
      // But actually, for simplicity in Lite, we will just blast the API, as the user wants local orchestration.
      // We assume DripFeed pieces run concurrently if interval passed.
      
      const baseQty = Math.floor(order.quantity / order.runs);
      const isLastRun = (order.currentRun + 1) >= order.runs;
      const qtyToOrder = isLastRun 
          ? order.quantity - (baseQty * (order.runs - 1)) 
          : baseQty;

      const provider = await providerService.getDefaultProvider();
      
      if (!order.service?.externalId) {
         throw new Error(`Service has no external ID mapped.`);
      }

      // We DO NOT pass runs and interval to provider, because WE are orchestrating it locally.
      const res = await provider.createOrder(
        order.service.externalId, 
        order.link, 
        qtyToOrder
      );

      if (res.success && res.externalId) {
        const nextRun = order.currentRun + 1;
        const finished = nextRun >= order.runs;

        await db.order.update({
          where: { id: order.id },
          data: { 
            externalId: res.externalId, // keep latest as primary for backward compat
            dripExternalIds: { push: res.externalId }, // Push new ID to the tracking array
            status: 'IN_PROGRESS',
            currentRun: nextRun,
            nextRunAt: finished ? null : new Date(Date.now() + order.interval * 60000)
          }
        });
        processed++;
      } else {
        const newRetryCount = (order.retryCount || 0) + 1;
        const isFatal = newRetryCount >= 3;

        if (isFatal) {
          const consumedCharge = Math.floor((order.charge * order.currentRun) / order.runs);
          const refundAmount = order.charge - consumedCharge;
          
          await db.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: { 
                nextRunAt: null,
                error: res.error || 'DripFeed chunk failed (FATAL)',
                retryCount: newRetryCount,
                status: order.currentRun === 0 ? 'ERROR' : 'PARTIAL'
              }
            });
            if (refundAmount > 0) {
              await tx.user.update({
                where: { id: order.userId },
                data: { 
                  balance: { increment: refundAmount },
                  totalSpent: { decrement: refundAmount }
                }
              });

              await tx.ledgerEntry.create({
                data: {
                  userId: order.userId,
                  amount: refundAmount,
                  reason: `Возврат средств по Drip-Feed заказу ${order.id} (ошибка) - Система`,
                  status: 'APPROVED'
                }
              });
            }
          });
        } else {
          await db.order.update({
            where: { id: order.id },
            data: { 
              nextRunAt: new Date(Date.now() + 15 * 60000),
              error: res.error || 'DripFeed chunk failed',
              retryCount: newRetryCount,
              status: 'IN_PROGRESS'
            }
          });
        }
        failed++;
      }
    } catch (e: any) {
      console.error(`Error in DripFeed chunk order ${order.id}:`, e);

      const newRetryCount = (order.retryCount || 0) + 1;
      const isFatal = newRetryCount >= 3;

      if (isFatal) {
        const consumedCharge = Math.floor((order.charge * order.currentRun) / (order.runs || 1));
        const refundAmount = order.charge - consumedCharge;

        await db.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { 
              nextRunAt: null,
              error: e.message || 'Worker Exception (FATAL)',
              retryCount: newRetryCount,
              status: order.currentRun === 0 ? 'ERROR' : 'PARTIAL'
            }
          });
          if (refundAmount > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: { balance: { increment: refundAmount }, totalSpent: { decrement: refundAmount } }
            });
            await tx.ledgerEntry.create({
              data: {
                userId: order.userId,
                adminId: 'system',
                amount: refundAmount,
                reason: `Возврат средств по Drip-Feed ${order.id} (crash) - Система`,
                status: 'APPROVED'
              }
            });
          }
        });
      } else {
        await db.order.update({
          where: { id: order.id },
          data: { 
            nextRunAt: new Date(Date.now() + 15 * 60000), // Retry in 15 min
            error: e.message || 'Worker Exception',
            retryCount: newRetryCount,
            status: 'IN_PROGRESS'
          }
        });
      }

      failed++;
    }
  }

  return NextResponse.json({
    message: `Drip-Feed cycle complete`,
    details: {
      totalFound: readyOrders.length,
      processedSuccessfully: processed,
      failedToProcess: failed
    }
  });
}
