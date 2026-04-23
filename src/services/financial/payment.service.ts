import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

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
    isDevSandbox = false,
    gatewayType: 'yookassa' | 'cryptobot' = 'yookassa',
    internalPaymentId?: string
  ): Promise<boolean> {
    try {
      // 1. Double-check against real gateway API in production
      if (!isDevSandbox && process.env.NODE_ENV === 'production' && gatewayType === 'yookassa') {
        const { SettingsManager } = require('@/lib/settings');
        const secrets = await SettingsManager.getPaymentSecrets();
        
        // We attempt to verify with YooKassa if secrets are configured
        if (secrets.yookassaShopId && secrets.yookassaSecretKey) {
            const authHeader = 'Basic ' + Buffer.from(`${secrets.yookassaShopId}:${secrets.yookassaSecretKey}`).toString('base64');
            try {
                const response = await fetch(`https://api.yookassa.ru/v3/payments/${gatewayId}`, {
                    headers: { 'Authorization': authHeader }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status !== 'succeeded') {
                        throw new Error(`PAYMENT_NOT_SUCCEEDED: Real gateway status is ${data.status}`);
                    }
                    const realAmount = Math.round(parseFloat(data.amount.value) * 100);
                    if (realAmount < amount) {
                        throw new Error(`PAYMENT_AMOUNT_MISMATCH: Webhook amount ${amount} exceeds Real amount ${realAmount}`);
                    }
                    console.log(`[Payment] Safely verified YooKassa payment ${gatewayId}`);
                } else if (response.status !== 404) {
                    throw new Error(`GATEWAY_ERROR: Failed to contact YooKassa API (${response.status})`);
                }
            } catch (e: any) {
                console.error(`[Payment] Verification Exploit Blocked: ${e.message}`);
                return false; // Reject payment
            }
        } else {
             console.warn(`[Payment] Skipping YooKassa verification for ${gatewayId} due to missing secrets in admin panel! DANGER!`);
        }
      }

      // 2. Atomic transaction: confirm payment + activate order
      await db.$transaction(async (tx) => {
        // Find payment by internal ID (preferred) or gateway ID
        let payment = null;
        if (internalPaymentId) {
          payment = await tx.payment.findUnique({ where: { id: internalPaymentId } });
        }
        if (!payment) {
          payment = await tx.payment.findUnique({ where: { gatewayId } });
        }

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

        // Amount underpayment guard
        if (payment.amount > amount) {
          console.error(`[Payment] Amount underpayment exploit attempt for ${gatewayId}: expected ${payment.amount}, got ${amount}`);
          throw new Error('PAYMENT_AMOUNT_MISMATCH: Underpayment detected. Order rejected.');
        }

        // Atomic update with status check (Postgres row lock)
        const updatedPayment = await tx.payment.updateMany({
          where: { 
            id: payment.id,
            status: 'PENDING' // Concurrent webhooks will fail this where clause
          },
          data: { 
            status: 'SUCCEEDED',
            gatewayId, // Ensure gatewayId is saved
            amount: amount // Update to actual amount received
          }
        });

        // Idempotency: if count is 0, another webhook already succeeded
        if (updatedPayment.count === 0) {
          console.log(`[Payment] ${gatewayId} already processed (atomic idempotency hit)`);
          return;
        }

        // Award Referral Commission on successful new fund influx
        try {
          const { LoyaltyService } = require('@/services/users/loyalty.service');
          await LoyaltyService.awardCommission(tx, payment.userId, amount);
        } catch (e) {
          console.error(`[PaymentService] Failed to award commission for payment ${payment.id}:`, e);
        }

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

            // Track user spending for loyalty tiers based on ACTUAL amount paid
            await tx.user.update({
              where: { id: payment.userId },
              data: { totalSpent: { increment: amount } }
            });
          }
        }
      });

      // Invalidate user dashboard cache so they see the new order & spending immediately
      revalidatePath('/dashboard', 'layout');
      
      // Check and issue promotional loyalty rewards based on new total spent
      import('@/services/users/promo-automation.service').then(mod => {
        mod.PromoAutomationService.checkAndIssueLoyalty(userId).catch(console.error);
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
      let capturedUserId: string | null = null;
      await db.$transaction(async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({
          where: { id: paymentId }
        });

        const updatedPayment = await tx.payment.updateMany({
          where: { 
            id: paymentId,
            status: 'PENDING'
          },
          data: { 
            status: 'SUCCEEDED',
            gatewayId: `test_${Date.now()}`
          }
        });

        // If count is 0, another concurrent call already activated it
        if (updatedPayment.count === 0) return;

        capturedUserId = payment.userId;

        // Award Referral Commission on successful test fund influx
        try {
          const { LoyaltyService } = require('@/services/users/loyalty.service');
          await LoyaltyService.awardCommission(tx, payment.userId, payment.amount);
        } catch (e) {
          console.error(`[PaymentService] Failed to award commission for test payment ${paymentId}:`, e);
        }

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

      revalidatePath('/dashboard', 'layout');

      if (capturedUserId) {
        import('@/services/users/promo-automation.service').then(mod => {
          mod.PromoAutomationService.checkAndIssueLoyalty(capturedUserId!).catch(console.error);
        });
      }

      return true;
    } catch (e: any) {
      console.error('[PaymentService] Error:', e.message);
      return false;
    }
  }
}

export const paymentService = new PaymentService();
