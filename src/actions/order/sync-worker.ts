import { db } from '@/lib/db';
import { providerService } from '@/services/providers/provider.service';

export class OrderSyncWorker {
  /**
   * Push PENDING orders to the Default Provider.
   */
  async processPendingQueue() {
    console.log('[SyncWorker] Processing PENDING queue...');
    
    const pendingOrders = await db.order.findMany({
      where: { status: 'PENDING' },
      take: 50,
      orderBy: { createdAt: 'asc' }
    });

    if (pendingOrders.length === 0) return;

    try {
      const provider = await providerService.getDefaultProvider();

      for (const order of pendingOrders) {
        try {
          const res = await provider.createOrder(
            order.serviceId, 
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
            await db.order.update({
              where: { id: order.id },
              data: { error: res.error || 'Failed to submit' }
            });
            // Keeping status as PENDING to retry, or you could change to ERROR based on business need.
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
      
      const externalIds = inProgressOrders.map(o => o.externalId as string);
      const statuses = await provider.getStatuses(externalIds);

      for (const order of inProgressOrders) {
        const extId = order.externalId as string;
        const newStatusData = statuses[extId];
        
        if (!newStatusData) continue;

        let newLocalStatus = order.status;
        let requiresRefund = false;
        let refundAmount = 0;

        // Map Provider Status to Local Status
        // Provider status strings usually: Pending, Processing, In progress, Completed, Partial, Canceled
        const sLower = (newStatusData.status || '').toLowerCase();
        
        if (sLower === 'completed') newLocalStatus = 'COMPLETED';
        else if (sLower === 'canceled') newLocalStatus = 'CANCELED';
        else if (sLower === 'partial') newLocalStatus = 'PARTIAL';
        else if (sLower === 'error') newLocalStatus = 'ERROR';

        if (newLocalStatus !== order.status || newStatusData.remains !== order.remains) {
          
          await db.$transaction(async (tx) => {
            // Lock user if we need to refund
            if (newLocalStatus === 'CANCELED' || newLocalStatus === 'PARTIAL') {
              if (order.status !== 'CANCELED' && order.status !== 'PARTIAL') {
                // Determine refund amount
                if (newLocalStatus === 'CANCELED') {
                  refundAmount = order.charge; // Full refund
                } else if (newLocalStatus === 'PARTIAL') {
                  // Partial refund based on remains ratio
                  const refundRatio = newStatusData.remains / order.quantity;
                  refundAmount = Math.floor(order.charge * refundRatio);
                }

                if (refundAmount > 0) {
                  await tx.user.update({
                    where: { id: order.userId },
                    data: { 
                      balance: { increment: refundAmount },
                      totalSpent: { decrement: refundAmount } // Rollback LTV technically
                    }
                  });
                }
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
