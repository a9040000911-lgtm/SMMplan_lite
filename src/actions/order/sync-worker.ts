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
          // ATOMIC LOCK: Prevent concurrent workers from sending the same order twice leading to duplicate provider charges
          const lock = await db.order.updateMany({
             where: { id: order.id, status: 'PENDING' },
             data: { status: 'PROVISIONING' }
          });
          if (lock.count === 0) continue;

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
            
            if (isFatal) {
              await db.$transaction(async (tx) => {
                await tx.order.update({
                  where: { id: order.id },
                  data: { 
                    error: res.error || 'Failed to submit (FATAL)',
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
                  error: res.error || 'Failed to submit',
                  retryCount: newRetryCount,
                  status: 'PENDING'
                }
              });
            }
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
        let totalRemainsToRefund = 0;
        let anyChunkFailed = false;

        if (order.isDripFeed && order.dripExternalIds && order.dripExternalIds.length > 0) {
           // Aggregate statuses across all chunks
           let completedChunks = 0;
           let finalFailedChunks = 0;
           let totalRemainsToRefund = 0;

           for (const chunkId of order.dripExternalIds) {
              const chunkStatusData = statuses[chunkId];
              if (!chunkStatusData) continue;
              const sLower = (chunkStatusData.status || '').toLowerCase();
              if (sLower === 'completed') {
                 completedChunks++;
              }
              else if (sLower === 'canceled' || sLower === 'error') {
                 finalFailedChunks++;
                 totalRemainsToRefund += Math.floor(order.quantity / (order.runs || 1));
              }
              else if (sLower === 'partial') {
                 finalFailedChunks++;
                 totalRemainsToRefund += chunkStatusData.remains || 0;
              }
           }

           // Check if we have finished dispatching all chunks AND all dispatched chunks are final
           const allDispatchedFinalized = (completedChunks + finalFailedChunks) === order.dripExternalIds.length;
           const isFinishedDispatching = order.currentRun >= (order.runs || 0) && order.nextRunAt === null;

           if (!isFinishedDispatching || !allDispatchedFinalized) {
               newLocalStatus = 'IN_PROGRESS';
           } else {
               if (finalFailedChunks > 0) {
                   newLocalStatus = 'PARTIAL';
               } else {
                   newLocalStatus = 'COMPLETED';
               }
           }

           if (newLocalStatus !== order.status) {
              await db.$transaction(async (tx) => {
                 const freshOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
                 if (freshOrder.status === 'CANCELED' || freshOrder.status === 'PARTIAL' || freshOrder.status === 'ERROR') return;
                 
                 if (finalFailedChunks > 0 && totalRemainsToRefund > 0) {
                    const refundRatio = Math.min(totalRemainsToRefund / freshOrder.quantity, 1);
                    const refundAmount = Math.floor(freshOrder.charge * refundRatio);
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
              if (freshOrder.status === 'CANCELED' || freshOrder.status === 'PARTIAL' || freshOrder.status === 'ERROR') {
                return; // Already processed — idempotency guard
              }

              let refundAmount = 0;
              // Lock user if we need to refund
              if (newLocalStatus === 'CANCELED' || newLocalStatus === 'PARTIAL' || newLocalStatus === 'ERROR') {
                  // Determine refund amount
                  if (newLocalStatus === 'CANCELED' || newLocalStatus === 'ERROR') {
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

                    await tx.ledgerEntry.create({
                      data: {
                        userId: freshOrder.userId,
                        amount: refundAmount,
                        reason: `Возврат средств по заказу ${order.id} (статус ${newLocalStatus}) - Система`,
                        status: 'APPROVED'
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
            }, { isolationLevel: 'Serializable' });
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
