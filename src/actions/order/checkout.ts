'use server';

import { db } from '@/lib/db';
import { marketingService, PricingResult } from '@/services/marketing.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';
import { orderService } from '@/services/core/order.service';
import { revalidatePath } from 'next/cache';
import { createSession } from '@/lib/session';

/**
 * Calculates price for display on the order form (no auth required).
 */
export async function calculatePriceAction(
  serviceId: string,
  quantity: number,
  promoCodeStr?: string,
  runs?: number
): Promise<{ success: boolean; data?: PricingResult; error?: string }> {
  try {
    const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;
    const result = await marketingService.calculatePrice(
      null, // No user context needed for price preview
      serviceId,
      totalQuantity,
      promoCodeStr
    );
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Pay-Per-Order Checkout Flow:
 * 1. Calculate price
 * 2. Create Order as AWAITING_PAYMENT
 * 3. Create Payment as PENDING linked to Order
 * 4. Return payment data for frontend redirect to YooKassa/CryptoBot
 */
import { z } from 'zod';
import { createSafeAction } from '@/lib/safe-action';

const checkoutSchema = z.object({
  serviceId: z.string(),
  link: z.string().url("Неверный формат ссылки"),
  quantity: z.number().min(1),
  email: z.string().email("Неверный email"),
  promoCodeStr: z.string().optional(),
  runs: z.number().int().positive().optional(),
  interval: z.number().int().positive().optional(),
  gateway: z.string().default('yookassa')
});

export const checkoutAction = async (input: z.infer<typeof checkoutSchema>) => {
  return createSafeAction(checkoutSchema, input, async (data) => {
    const { serviceId, link, quantity, email, promoCodeStr, runs, interval, gateway } = data;
    // 0. Rate limit
    const isAllowed = await RateLimitService.check("checkoutCore", 15, 60);
    if (!isAllowed) {
      throw new Error("Слишком много запросов. Попробуйте через минуту.");
    }

    // 1. Validate email
    if (!email || !email.includes('@')) {
      throw new Error("Введите корректный email");
    }

    // 2. Validate service exists
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      throw new Error("Услуга не найдена или неактивна");
    }

    if (!service.externalId) {
      throw new Error("Услуга не привязана к провайдеру");
    }

    const isTestMode = await SettingsManager.isTestMode();

    // 3. Find or create user by email using atomic upsert (prevents race conditions)
    const user = await db.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: { email: email.toLowerCase() }
    });

    // 4. Calculate price based on TOTAL quantity and actual User ID for Loyalty Tier eval
    const totalQuantity = (runs && runs > 0) ? quantity * runs : quantity;
    const pricing = await marketingService.calculatePrice(user.id, serviceId, totalQuantity, promoCodeStr);

    // 5. Create Order + Payment atomically
    const result = await db.$transaction(async (tx) => {
      // Create Order
      const newOrder = await orderService.createOrderTransaction(tx, {
        userId: user.id,
        serviceId,
        link,
        quantity: totalQuantity,
        email,
        status: 'AWAITING_PAYMENT',
        charge: pricing.totalCents,
        providerCost: pricing.providerCostCents,
        runs,
        interval,
        isTestMode
      });

      // Consume Promo Code if used
      if (promoCodeStr) {
        await marketingService.consumePromoCode(tx, promoCodeStr);
      }

      // Create linked Payment
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          orderId: newOrder.id,
          amount: pricing.totalCents,
          currency: 'RUB',
          status: 'PENDING',
          gateway
        }
      });

      return { orderId: newOrder.id, paymentId: payment.id };
    });

    // 6. Generate payment URL (gateway-specific API calls)
    const amountRub = (pricing.totalCents / 100).toFixed(2);
    let paymentUrl = '';
    let remoteGatewayId = '';
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/success`;

    try {
      if (gateway === 'balance') {
        // We will perform atomic deduction inside the transaction to prevent race condition double-spending
        await db.$transaction(async (tx) => {
          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: { 
              balance: { decrement: pricing.totalCents },
              totalSpent: { increment: pricing.totalCents } 
            }
          });

          await tx.ledgerEntry.create({
            data: {
              userId: user.id,
              amount: -pricing.totalCents,
              reason: `Оплата заказа ${result.orderId} (Списание)`,
              status: 'APPROVED'
            }
          });

          if (updatedUser.balance < 0) {
            throw new Error('Недостаточно средств на внутреннем балансе. Транзакция отклонена.');
          }

          await tx.payment.update({
            where: { id: result.paymentId },
            data: { status: 'SUCCEEDED', gatewayId: `internal_${Date.now()}` }
          });
          await tx.order.update({
            where: { id: result.orderId },
            data: { status: 'PENDING' }
          });
        });

        paymentUrl = successUrl;
        remoteGatewayId = `internal_${Date.now()}`;
      } else if (isTestMode) {
        paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${result.paymentId}`;
        remoteGatewayId = `dev_${result.paymentId}`; // mock ID
      } else if (gateway === 'yookassa') {
        const secrets = await SettingsManager.getPaymentSecrets();
        const shopId = secrets.yookassaShopId;
        const secretKey = secrets.yookassaSecretKey;
        if (!shopId || !secretKey) throw new Error('YooKassa is not configured in Admin Panel');

        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const payload = {
          amount: { value: amountRub, currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: successUrl },
          description: `Заказ Smmplan #${result.orderId}`,
          metadata: { paymentId: result.paymentId, orderId: result.orderId, userId: user.id }
        };

        const resp = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'Idempotence-Key': result.paymentId
          },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          console.error('[Checkout] YooKassa API Error:', await resp.text());
          throw new Error('Ошибка шлюза YooKassa');
        }

        const data = await resp.json();
        paymentUrl = data.confirmation.confirmation_url;
        remoteGatewayId = data.id;

      } else if (gateway === 'cryptobot') {
        const secrets = await SettingsManager.getPaymentSecrets();
        const cryptoToken = secrets.cryptoBotToken;
        if (!cryptoToken) throw new Error('CryptoBot is not configured in Admin Panel');

        const resp = await fetch('https://pay.crypt.bot/api/createInvoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Crypto-Pay-API-Token': cryptoToken
          },
          body: JSON.stringify({
            currency_type: 'fiat', // Allow paying in TON but amount specified in RUB
            fiat: 'RUB',
            amount: amountRub,
            description: `Заказ Smmplan #${result.orderId}`,
            hidden_message: `Ваш заказ: ${result.orderId}`,
            payload: result.paymentId
          })
        });

        if (!resp.ok) {
          console.error('[Checkout] CryptoBot API Error:', await resp.text());
          throw new Error('Ошибка шлюза CryptoBot');
        }

        const data = await resp.json();
        if (!data.ok) throw new Error('CryptoBot returned error: ' + JSON.stringify(data.error));
        
        paymentUrl = data.result.pay_url;
        remoteGatewayId = data.result.invoice_id.toString();
      }

      // 7. Store the remoteGatewayId on the Payment record so Webhooks can match it
      if (remoteGatewayId) {
        await db.payment.update({
          where: { id: result.paymentId },
          data: { gatewayId: remoteGatewayId }
        });
      }
    } catch (gatewayErr: any) {
      // 7.b ROLLBACK: If Gateway failed, restore PromoCode and mark Payment as ERROR safely
      console.error('[Checkout] Gateway sequence failed, rolling back sequence', gatewayErr);
      
      const rollbackPromises: Promise<any>[] = [
        db.payment.update({
          where: { id: result.paymentId },
          data: { status: 'CANCELED' }
        }).catch(e => console.error('[Checkout] Failed to cancel payment:', e)),
        
        db.order.update({
          where: { id: result.orderId },
          data: { status: 'ERROR', error: gatewayErr.message || 'Ошибка генерации платежа' }
        }).catch(e => console.error('[Checkout] Failed to error order:', e))
      ];

      if (promoCodeStr) {
        // Atomic rollback: only decrement if uses > 0 to prevent negative counters
        rollbackPromises.push(
          db.promoCode.updateMany({
             where: { code: promoCodeStr, uses: { gt: 0 } },
             data: { uses: { decrement: 1 } }
          }).catch(e => console.error('[Checkout] Failed to rollback promo:', e))
        );
      }
      
      await Promise.allSettled(rollbackPromises);
      
      throw new Error(gatewayErr.message || 'Ошибка на стороне платежного шлюза. Попробуйте другой метод');
    }

    // 8. Auto-Login using cookies (Frictionless checkout)
    await createSession(user.id);

    revalidatePath('/dashboard', 'layout');

    return { 
      orderId: result.orderId, 
      paymentId: result.paymentId,
      paymentUrl
    };
  });
};
