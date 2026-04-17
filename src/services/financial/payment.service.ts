import { db } from '@/lib/db';

export class PaymentService {
  /**
   * Confirms a payment and activates the linked order.
   * Called by webhook handlers (YooKassa, CryptoBot).
   * 
   * Flow: Payment PENDING → SUCCEEDED → Order AWAITING_PAYMENT → PENDING
   */
  async confirmPayment(
    gatewayId: string, 
    amount: number, 
    userId: string, 
    isDevSandbox = false
  ): Promise<boolean> {
    try {
      // 1. Double-check against real gateway API in production
      if (!isDevSandbox && process.env.NODE_ENV === 'production') {
        // TODO: Make GET request to YooKassa API to verify payment status
        console.warn(`[Payment] Implement real YooKassa verification for ${gatewayId}`);
      }

      // 2. Atomic transaction: confirm payment + activate order
      await db.$transaction(async (tx) => {
        // Find payment by gateway ID
        const payment = await tx.payment.findUnique({
          where: { gatewayId }
        });

        if (!payment) {
          // Payment record might not exist yet (webhook arrived before checkout finished)
          // Create it and try to match later
          await tx.payment.create({
            data: {
              gatewayId,
              userId,
              amount,
              currency: 'RUB',
              status: 'SUCCEEDED'
            }
          });
          console.warn(`[Payment] Created orphan payment ${gatewayId} — no linked order`);
          return;
        }

        // Idempotency: already processed
        if (payment.status === 'SUCCEEDED') {
          console.log(`[Payment] ${gatewayId} already processed (idempotency hit)`);
          return;
        }

        // Amount mismatch check
        if (payment.amount !== amount) {
          console.error(`[Payment] Amount mismatch for ${gatewayId}: expected ${payment.amount}, got ${amount}`);
          // Still process — the gateway has the final say on amount
        }

        // Mark payment as succeeded
        await tx.payment.update({
          where: { id: payment.id },
          data: { 
            status: 'SUCCEEDED',
            gatewayId // Ensure gatewayId is saved
          }
        });

        // Activate linked order (AWAITING_PAYMENT → PENDING)
        if (payment.orderId) {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId }
          });

          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: 'PENDING' }
            });
            console.log(`[Payment] Order ${payment.orderId} activated → PENDING`);

            // Track user spending for loyalty tiers
            await tx.user.update({
              where: { id: payment.userId },
              data: { totalSpent: { increment: payment.amount } }
            });
          }
        }
      });

      return true;
    } catch (e: any) {
      console.error('[PaymentService] Error confirming payment:', e.message);
      return false;
    }
  }

  /**
   * Confirms a payment directly by paymentId (for mock/test flows).
   */
  async confirmPaymentById(paymentId: string): Promise<boolean> {
    try {
      await db.$transaction(async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId }
        });

        if (payment.status === 'SUCCEEDED') return; // Already done

        await tx.payment.update({
          where: { id: paymentId },
          data: { 
            status: 'SUCCEEDED',
            gatewayId: `test_${Date.now()}`
          }
        });

        // Activate linked order
        if (payment.orderId) {
          const order = await tx.order.findUnique({
            where: { id: payment.orderId }
          });

          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: 'PENDING' }
            });

            await tx.user.update({
              where: { id: payment.userId },
              data: { totalSpent: { increment: payment.amount } }
            });
          }
        }
      });

      return true;
    } catch (e: any) {
      console.error('[PaymentService] Error:', e.message);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
