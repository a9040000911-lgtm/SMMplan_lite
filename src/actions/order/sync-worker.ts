import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';

export class OrderSyncWorker {
  /**
   * Push PENDING orders to the Default Provider.
   */
  async processPendingQueue() {
    console.log('[SyncWorker] Processing PENDING queue...');
    
    const pendingOrders = await db.order.findMany({
      where: { status: 'PENDING', isDripFeed: false },
      take: 50,
      include: { service: true },
      orderBy: { createdAt: 'asc' }
    });

    if (pendingOrders.length === 0) return;

    try {
      const provider = await providerService.getDefaultProvider();

      for (const order of pendingOrders) {
        try {
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
              data: { externalId: res.externalId, status: 'IN_PROGRESS', error: null }
            });
          } else {
            const newRetryCount = (order.retryCount || 0) + 1;
            const isFatal = newRetryCount >= 3;
            await db.order.update({
              where: { id: order.id },
              data: { 
                error: res.error || 'Failed to submit',
                retryCount: newRetryCount,
                status: isFatal ? 'ERROR' : 'PENDING'
              }
            });
          }
        } catch (e: any) {
          console.error(`[SyncWorker] Failed to push order ${order.id}:`, e);
        }
      }
    } catch (e) {
      console.error('[SyncWorker] Could not initialize provider:', e);
    }
  }

  /**
   * Pull Statuses for IN_PROGRESS orders.
   */
  async checkInProgressOrders() {
    console.log('[SyncWorker] Checking IN_PROGRESS statuses...');

    const inProgressOrders = await db.order.findMany({
      where: { 
        status: 'IN_PROGRESS', 
        externalId: { not: null } 
      },
      take: 100, // Process in batches
      orderBy: { updatedAt: 'asc' } // Oldest checked first
    });

    if (inProgressOrders.length === 0) return;

    try {
      const provider = await providerService.getDefaultProvider();
      
      // Collect all IDs to query
      const allExternalIds = new Set<string>();
      inProgressOrders.forEach(o => {
        if (o.externalId) allExternalIds.add(o.externalId);
        o.dripExternalIds?.forEach(id => allExternalIds.add(id));
      });
      
      const statuses = await provider.getStatuses(Array.from(allExternalIds));

      for (const order of inProgressOrders) {
        let newLocalStatus = order.status;
        let requiresRefund = false;
        let totalRemainsToRefund = 0;
        let anyChunkFailed = false;

        if (order.isDripFeed && order.dripExternalIds && order.dripExternalIds.length > 0) {
           // Aggregate statuses across all chunks
           let completedChunks = 0;
           for (const chunkId of order.dripExternalIds) {
              const chunkStatusData = statuses[chunkId];
              if (!chunkStatusData) continue;
              const sLower = (chunkStatusData.status || '').toLowerCase();
              if (sLower === 'completed') completedChunks++;
              else if (sLower === 'canceled' || sLower === 'error') {
                 anyChunkFailed = true;
                 totalRemainsToRefund += Math.floor(order.quantity / (order.runs || 1)); // Approximation of chunk size
              }
              else if (sLower === 'partial') {
                 anyChunkFailed = true;
                 totalRemainsToRefund += chunkStatusData.remains || 0;
              }
           }

           if (anyChunkFailed) {
              newLocalStatus = 'PARTIAL'; // Treat any failure in drip as a partial overall
           } else if (completedChunks === order.runs && order.runs > 0) {
              newLocalStatus = 'COMPLETED';
           } else {
              newLocalStatus = 'IN_PROGRESS'; // Still going
           }

           if (newLocalStatus !== order.status) {
              await db.$transaction(async (tx) => {
                 const freshOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
                 if (freshOrder.status === 'CANCELED' || freshOrder.status === 'PARTIAL') return;
                 
                 let refundAmount = 0;
                 if (anyChunkFailed && totalRemainsToRefund > 0) {
                    const refundRatio = Math.min(totalRemainsToRefund / freshOrder.quantity, 1);
                    refundAmount = Math.floor(freshOrder.charge * refundRatio);
                    if (refundAmount > 0) {
                      await tx.user.update({
                        where: { id: freshOrder.userId },
                        data: { balance: { increment: refundAmount }, totalSpent: { decrement: refundAmount } }
                      });
                    }
                 }
                 await tx.order.update({
                    where: { id: order.id },
                    data: { status: newLocalStatus, remains: totalRemainsToRefund }
                 });
              });
           }
        } else {
          // Standard Single Order Logic
          const extId = order.externalId as string;
          const newStatusData = statuses[extId];
          
          if (!newStatusData) continue;

          // Map Provider Status to Local Status
          const sLower = (newStatusData.status || '').toLowerCase();
          
          if (sLower === 'completed') newLocalStatus = 'COMPLETED';
          else if (sLower === 'canceled') newLocalStatus = 'CANCELED';
          else if (sLower === 'partial') newLocalStatus = 'PARTIAL';
          else if (sLower === 'error') newLocalStatus = 'ERROR';

          if (newLocalStatus !== order.status || newStatusData.remains !== order.remains) {
            
            await db.$transaction(async (tx) => {
              // Re-read order inside transaction to prevent double-refund race
              const freshOrder = await tx.order.findUniqueOrThrow({
                where: { id: order.id }
              });

              // If already refunded by another concurrent run, skip
              if (freshOrder.status === 'CANCELED' || freshOrder.status === 'PARTIAL') {
                return; // Already processed — idempotency guard
              }

              let refundAmount = 0;
              // Lock user if we need to refund
              if (newLocalStatus === 'CANCELED' || newLocalStatus === 'PARTIAL') {
                  // Determine refund amount
                  if (newLocalStatus === 'CANCELED') {
                    refundAmount = freshOrder.charge; // Full refund
                  } else if (newLocalStatus === 'PARTIAL') {
                    // Partial refund based on remains ratio
                    const refundRatio = newStatusData.remains / freshOrder.quantity;
                    refundAmount = Math.floor(freshOrder.charge * refundRatio);
                  }

                  if (refundAmount > 0) {
                    await tx.user.update({
                      where: { id: freshOrder.userId },
                      data: { 
                        balance: { increment: refundAmount },
                        totalSpent: { decrement: refundAmount }
                      }
                    });
                  }
              }

              // Update order
              await tx.order.update({
                where: { id: order.id },
                data: {
                  status: newLocalStatus,
                  remains: newStatusData.remains,
                  error: newStatusData.error || null,
                }
              });
            });
          }
        }
      }
    } catch (e: any) {
      console.error('[SyncWorker] Error pulling statuses:', e);
    }
  }

  /**
   * Master execution function orchestrating queues
   */
  async runAllCycles() {
    await this.processPendingQueue();
    await this.checkInProgressOrders();
  }
}

export const orderSyncWorker = new OrderSyncWorker();
