import { db } from '@/lib/db';
import { SettingsManager } from '@/lib/settings';

type PaymentMetadata = {
  source?: string;
  serviceId?: string;
  promoId?: string;
  [key: string]: any;
};

export class UnifiedPaymentService {
  /**
   * Universal method to generate payment URLs for the Bot (Deposits & Top-ups).
   * Note: projectId is ignored since Smmplan_lite is primarily single-project but kept for signature compatibility.
   */
  static async createPayment(
    projectId: string | undefined, 
    userId: string, 
    amountRub: number, 
    description: string, 
    metadata: PaymentMetadata,
    gateway: 'yookassa' | 'cryptobot' = 'yookassa'
  ): Promise<{ success: boolean; confirmationUrl?: string; paymentId?: string; error?: string }> {
    try {
      const amountCents = Math.round(amountRub * 100);

      // 1. Create a PENDING payment record
      // We do not link an orderId, making it a pure deposit/fund-loading payment.
      const payment = await db.payment.create({
        data: {
          userId,
          amount: amountCents,
          currency: 'RUB',
          status: 'PENDING',
          gateway
        }
      });

      const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://smmplan.ru'}/dashboard`;
      let paymentUrl = '';
      let remoteGatewayId = '';

      // 2. Generate Payment Link
      if (gateway === 'yookassa') {
        const secrets = await SettingsManager.getPaymentSecrets();
        const shopId = secrets.yookassaShopId;
        const secretKey = secrets.yookassaSecretKey;

        if (!shopId || !secretKey) {
            console.error('[UnifiedPayment] YooKassa not configured');
            return { success: false, error: 'Payment gateway unconfigured' };
        }

        const authHeader = 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
        const payload = {
          amount: { value: amountRub.toFixed(2), currency: 'RUB' },
          capture: true,
          confirmation: { type: 'redirect', return_url: successUrl },
          description,
          metadata: { paymentId: payment.id, userId, ...metadata }
        };

        const resp = await fetch('https://api.yookassa.ru/v3/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'Idempotence-Key': payment.id
          },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          console.error('[UnifiedPayment] YooKassa error:', await resp.text());
          return { success: false, error: 'YooKassa gateway error' };
        }

        const data = await resp.json();
        paymentUrl = data.confirmation.confirmation_url;
        remoteGatewayId = data.id;

      } else if (gateway === 'cryptobot') {
        const secrets = await SettingsManager.getPaymentSecrets();
        const cryptoToken = secrets.cryptoBotToken;

        if (!cryptoToken) {
            console.error('[UnifiedPayment] CryptoBot not configured');
            return { success: false, error: 'Payment gateway unconfigured' };
        }

        const resp = await fetch('https://pay.crypt.bot/api/createInvoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Crypto-Pay-API-Token': cryptoToken
          },
          body: JSON.stringify({
            currency_type: 'fiat', 
            fiat: 'RUB',
            amount: amountRub.toFixed(2),
            description,
            hidden_message: `Smmplan Deposit`,
            payload: payment.id
          })
        });

        if (!resp.ok) {
          console.error('[UnifiedPayment] CryptoBot error:', await resp.text());
          return { success: false, error: 'CryptoBot gateway error' };
        }

        const data = await resp.json();
        if (!data.ok) return { success: false, error: 'CryptoBot logic error' };
        
        paymentUrl = data.result.pay_url;
        remoteGatewayId = data.result.invoice_id.toString();
      }

      // 3. Save remote ID for Webhook mapping
      if (remoteGatewayId) {
        await db.payment.update({
          where: { id: payment.id },
          data: { gatewayId: remoteGatewayId }
        });
      }

      return {
        success: true,
        paymentId: payment.id,
        confirmationUrl: paymentUrl
      };

    } catch (e: any) {
      console.error('[UnifiedPayment] System error:', e.message);
      return { success: false, error: 'Internal logic exception' };
    }
  }
}
