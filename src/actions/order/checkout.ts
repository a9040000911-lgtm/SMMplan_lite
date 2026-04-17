'use server';

import { db } from '@/lib/db';
import { marketingService, PricingResult } from '@/services/marketing.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';

/**
 * Calculates price for display on the order form (no auth required).
 */
export async function calculatePriceAction(
  serviceId: string,
  quantity: number,
  promoCodeStr?: string
): Promise<{ success: boolean; data?: PricingResult; error?: string }> {
  try {
    const result = await marketingService.calculatePrice(
      null, // No user context needed for price preview
      serviceId,
      quantity,
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
export async function checkoutAction(
  serviceId: string,
  link: string,
  quantity: number,
  email: string,
  promoCodeStr?: string,
  runs?: number,
  interval?: number,
  gateway: string = 'yookassa'
): Promise<{ 
  success: boolean; 
  orderId?: string; 
  paymentId?: string;
  paymentUrl?: string;
  error?: string 
}> {
  try {
    // 0. Rate limit
    const isAllowed = await RateLimitService.check("checkoutCore", 15, 60);
    if (!isAllowed) {
      return { success: false, error: "Слишком много запросов. Попробуйте через минуту." };
    }

    // 1. Validate email
    if (!email || !email.includes('@')) {
      return { success: false, error: "Введите корректный email" };
    }

    // 2. Validate service exists
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      return { success: false, error: "Услуга не найдена или неактивна" };
    }

    if (!service.externalId) {
      return { success: false, error: "Услуга не привязана к провайдеру" };
    }

    const isTestMode = await SettingsManager.isTestMode();

    // 3. Calculate price
    const pricing = await marketingService.calculatePrice(null, serviceId, quantity, promoCodeStr);

    // 4. Find or create user by email
    let user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      user = await db.user.create({ data: { email: email.toLowerCase() } });
    }

    // 5. Create Order + Payment atomically
    const result = await db.$transaction(async (tx) => {
      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          serviceId,
          link,
          quantity,
          email: email.toLowerCase(),
          status: 'AWAITING_PAYMENT',
          charge: pricing.totalCents,
          providerCost: pricing.providerCostCents,
          remains: quantity,
          runs,
          interval,
          isTest: isTestMode,
          isDripFeed: (runs && runs > 1) ? true : false,
          nextRunAt: (runs && runs > 1) ? new Date() : null
        }
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

    if (isTestMode) {
      paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/mock-payment?paymentId=${result.paymentId}`;
      remoteGatewayId = `dev_${result.paymentId}`; // mock ID
    } else if (gateway === 'yookassa') {
      const shopId = process.env.YOOKASSA_SHOP_ID;
      const secretKey = process.env.YOOKASSA_SECRET_KEY;
      if (!shopId || !secretKey) throw new Error('YooKassa is not configured');

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
      const cryptoToken = process.env.CRYPTO_BOT_TOKEN;
      if (!cryptoToken) throw new Error('CryptoBot is not configured');

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

    return { 
      success: true, 
      orderId: result.orderId, 
      paymentId: result.paymentId,
      paymentUrl
    };
  } catch (error: any) {
    console.error('[Checkout] Error:', error);
    return { success: false, error: error.message };
  }
}
