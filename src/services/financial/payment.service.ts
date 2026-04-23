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
    internalPaymentId?: string,
    metadataType?: string
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

        // 1. Process or Create Payment atomically via Upsert to prevent orphaned double-creation
        const currentPayment = payment
          ? await tx.payment.findUnique({ where: { id: payment.id } })
          : await tx.payment.findUnique({ where: { gatewayId } });

        if (currentPayment && currentPayment.status === 'SUCCEEDED') {
          console.log(`[Payment] ${gatewayId} already processed (atomic idempotency hit)`);
          return;
        }

        if (currentPayment && currentPayment.amount > amount) {
          console.error(`[Payment] Amount underpayment exploit attempt for ${gatewayId}: expected ${currentPayment.amount}, got ${amount}`);
          throw new Error('PAYMENT_AMOUNT_MISMATCH: Underpayment detected. Order rejected.');
        }

        let processedPaymentId = '';
        let isOrderPayment = false;
        let linkedOrderId = '';

        if (currentPayment) {
          const updated = await tx.payment.updateMany({
            where: { id: currentPayment.id, status: 'PENDING' },
            data: { status: 'SUCCEEDED', gatewayId, amount }
          });
          if (updated.count === 0) return; // DB lock idempotency
          processedPaymentId = currentPayment.id;
          isOrderPayment = !!currentPayment.orderId;
          linkedOrderId = currentPayment.orderId || '';
        } else if (metadataType === 'deposit') {
          // [SECURITY] Deposit Webhook Exception: Allows top-up even if PENDING state was lost or not created correctly
          const newPayment = await tx.payment.create({
            data: { userId, amount, currency: 'RUB', status: 'SUCCEEDED', gatewayId, gateway: gatewayType }
          });
          processedPaymentId = newPayment.id;
          isOrderPayment = false;
        } else {
          // [SECURITY] Orphan webhook rejected
          console.error(`[SECURITY] Orphan webhook rejected for gatewayId: ${gatewayId}. No PENDING payment found.`);
          throw new Error('ORPHAN_WEBHOOK: Stray webhooks are no longer allowed to credit accounts.');
        }

        // Award Referral Commission on successful new fund influx
        try {
          const { LoyaltyService } = require('@/services/users/loyalty.service');
          await LoyaltyService.awardCommission(tx, userId, amount);
        } catch (e) {
          console.error(`[PaymentService] Failed to award commission for payment ${processedPaymentId}:`, e);
        }

        // Assign funds locally
        if (isOrderPayment && linkedOrderId) {
          // Activate linked order
          const order = await tx.order.findUnique({ where: { id: linkedOrderId } });
          if (order && order.status === 'AWAITING_PAYMENT') {
            await tx.order.update({
              where: { id: linkedOrderId },
              data: { status: 'PENDING' }
            });
            await tx.user.update({
              where: { id: userId },
              data: { totalSpent: { increment: amount } }
            });
          }
        } else {
          // Direct top-up (Deposit) - Increment User Balance securely!
          await tx.user.update({
            where: { id: userId },
            data: { 
              balance: { increment: amount },
              totalSpent: { increment: amount }
            }
          });
          
          await tx.ledgerEntry.create({
            data: {
              userId,
              amount: amount,
              reason: `Пополнение баланса через ${gatewayType}`,
              status: 'APPROVED'
            }
          });
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
