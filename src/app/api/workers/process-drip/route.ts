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
            externalId: res.externalId, // Overwrite with newest chunk ID
            status: 'IN_PROGRESS',
            currentRun: nextRun,
            nextRunAt: finished ? null : new Date(Date.now() + order.interval * 60000)
          }
        });
        processed++;
      } else {
        const newRetryCount = (order.retryCount || 0) + 1;
        const isFatal = newRetryCount >= 3;

        await db.order.update({
          where: { id: order.id },
          data: { 
             // Delay retry by 15 mins if not fatal
            nextRunAt: isFatal ? null : new Date(Date.now() + 15 * 60000),
            error: res.error || 'DripFeed chunk failed',
            retryCount: newRetryCount,
            status: isFatal ? 'ERROR' : 'IN_PROGRESS'
          }
        });
        failed++;
      }
    } catch (e: any) {
      console.error(`Error in DripFeed chunk order ${order.id}:`, e);
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
