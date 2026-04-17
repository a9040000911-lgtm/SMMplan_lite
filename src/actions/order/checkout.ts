'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { marketingService, PricingResult } from '@/services/marketing.service';
import { providerService } from '@/services/providers/provider.service';
import { RateLimitService } from '@/services/core/rate-limit.service';
import { SettingsManager } from '@/lib/settings';

export async function calculatePriceAction(
  serviceId: string,
  quantity: number,
  promoCodeStr?: string
): Promise<{ success: boolean; data?: PricingResult; error?: string }> {
  try {
    const session = await verifySession().catch(() => null);

    const result = await marketingService.calculatePrice(
      session?.userId || null,
      serviceId,
      quantity,
      promoCodeStr
    );

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkoutAction(
  serviceId: string,
  link: string,
  quantity: number,
  promoCodeStr?: string,
  runs?: number,
  interval?: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const session = await verifySession();
    if (!session) {
      return { success: false, error: 'Unauthorized' };
    }

    return await checkoutCore(session.userId, serviceId, link, quantity, promoCodeStr, runs, interval);
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return { success: false, error: 'Недостаточно средств на балансе' };
    }
    return { success: false, error: error.message };
  }
}

/** 
 * Internal core checkout logic decoupled from session context 
 * so it can be safely called by B2B handlers.
 */
export async function checkoutCore(
  userId: string,
  serviceId: string,
  link: string,
  quantity: number,
  promoCodeStr?: string,
  runs?: number,
  interval?: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // 0. Protect against API spam via Redis/Postgres RateLimiter
    const isAllowed = await RateLimitService.check("checkoutCore", 15, 60);
    if (!isAllowed) {
       return { success: false, error: "Слишком много запросов. Попробуйте через минуту." };
    }

    const isTestModeActive = await SettingsManager.isTestMode();

    // 1. Double check and calculate final price
    const pricing = await marketingService.calculatePrice(userId, serviceId, quantity, promoCodeStr);

    // 2. Wrap creation in transaction to prevent concurrency balance attacks
    const orderId = await db.$transaction(async (tx) => {
      // Re-fetch user lock inside transaction to ensure precise balance
      const lockUser = await tx.user.findUnique({
        where: { id: userId }
      });

      if (!lockUser || lockUser.balance < pricing.totalCents) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // Deduct balance & increment totalSpent
      await tx.user.update({
        where: { id: userId },
        data: { 
          balance: { decrement: pricing.totalCents },
          totalSpent: { increment: pricing.totalCents } 
        }
      });

      // Consume Promo Code
      if (promoCodeStr) {
        await marketingService.consumePromoCode(tx, promoCodeStr);
      }

      // Referral Commission Logic (5% of Net Profit)
      if (lockUser.referredById) {
        const netProfitCents = pricing.totalCents - pricing.providerCostCents;
        if (netProfitCents > 0) {
          const commissionAmount = Math.floor(netProfitCents * 0.05); // 5%
          if (commissionAmount > 0) {
            await tx.commission.create({
              data: {
                orderId: 'TBD', // Will update below
                referrerId: lockUser.referredById,
                amount: commissionAmount,
                status: 'PENDING'
              }
            });
          }
        }
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId,
          serviceId,
          link,
          quantity,
          status: 'PENDING',
          charge: pricing.totalCents,
          providerCost: pricing.providerCostCents,
          remains: quantity,
          runs,
          interval,
          isTest: isTestModeActive,
          isDripFeed: (runs && runs > 1) ? true : false,
          nextRunAt: (runs && runs > 1) ? new Date() : null
        }
      });

      // Update Commission with actual OrderId if it was created
      if (lockUser.referredById) {
         await tx.commission.updateMany({
           where: { orderId: 'TBD', referrerId: lockUser.referredById },
           data: { orderId: newOrder.id }
         });
      }

      return newOrder.id;
    });

    // 3. Trigger Loyalty/Promo Automation async (don't await so we don't slow down checkout UX)
    import('@/services/users/promo-automation.service').then(m => {
      m.PromoAutomationService.checkAndIssueLoyalty(userId);
    }).catch(console.error);

    // 4. Background worker will handle provisioning.
    // Checkout is now instantaneous and fully decoupled.
    return { success: true, orderId };
  } catch (error: any) {
    throw error;
  }
}
