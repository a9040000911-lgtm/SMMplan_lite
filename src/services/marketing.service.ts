import { db } from '@/lib/db';

export type PricingResult = {
  totalCents: number;
  originalTotalCents: number;
  discountCents: number;
  discountPercent: number;
  providerCostCents: number;
  tier: string;
};

export class MarketingService {
  /**
   * Evaluates volume discount tier based on total spent.
   * Returns generic tier names and their respective percent discount.
   */
  getVolumeTier(totalSpentCents: number): { name: string; discountPercent: number } {
    if (totalSpentCents >= 100_000_00) { // 1m RUB
      return { name: 'PLATINUM', discountPercent: 15.0 };
    }
    if (totalSpentCents >= 25_000_00) { // 250k RUB
      return { name: 'GOLD', discountPercent: 10.0 };
    }
    if (totalSpentCents >= 5_000_00) { // 50k RUB
      return { name: 'SILVER', discountPercent: 5.0 };
    }
    if (totalSpentCents >= 1_000_00) { // 10k RUB
      return { name: 'BRONZE', discountPercent: 2.0 };
    }
    return { name: 'REGULAR', discountPercent: 0.0 };
  }

  /**
   * Calculates the final price for an order, applying the maximum available discount
   * between User Volume Tier, User Personal Discount, and Promo Code.
   */
  async calculatePrice(
    userId: string | null | undefined,
    serviceId: string,
    quantity: number,
    promoCodeStr?: string | null
  ): Promise<PricingResult> {
    let user = null;
    if (userId) {
      user = await db.user.findUnique({ where: { id: userId } });
    }

    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new Error('Service not found');

    if (quantity < service.minQty || quantity > service.maxQty) {
      throw new Error(`Quantity must be between ${service.minQty} and ${service.maxQty}`);
    }

    // 1. Calculate base original price in Cents
    const providerCostPer1000Cents = service.rate * 100;
    const providerCostCents = Math.round((providerCostPer1000Cents / 1000) * quantity);

    const originalTotalCents = Math.round(providerCostCents * service.markup);

    // 2. Discover available discounts
    const volumeTier = user ? this.getVolumeTier(user.totalSpent) : { name: 'REGULAR', discountPercent: 0.0 };
    let promoDiscountPercent = 0.0;
    
    if (promoCodeStr) {
      const promo = await db.promoCode.findUnique({ where: { code: promoCodeStr } });
      if (promo && promo.isActive && promo.uses < promo.maxUses) {
        if (!promo.expiresAt || promo.expiresAt > new Date()) {
          promoDiscountPercent = promo.discountPercent;
        }
      }
    }

    // 3. Find the maximum discount available to prevent margin squeeze
    // (We do not stack them additively)
    const maxDiscountPercent = Math.max(
      user?.personalDiscount || 0,
      volumeTier.discountPercent,
      promoDiscountPercent
    );

    // 4. Calculate Final Cents
    const discountCents = Math.round((originalTotalCents * maxDiscountPercent) / 100);
    let totalCents = originalTotalCents - discountCents;

    // Failsafe: Never sell below provider cost
    if (totalCents < providerCostCents) {
      totalCents = providerCostCents; // zero markup, zero loss
    }

    return {
      totalCents,
      originalTotalCents,
      discountCents,
      discountPercent: maxDiscountPercent,
      providerCostCents,
      tier: volumeTier.name,
    };
  }

  /**
   * Applies the use of a promo code atomically if required.
   */
  async consumePromoCode(tx: any, promoCodeStr?: string | null) {
    if (!promoCodeStr) return;

    const promo = await tx.promoCode.findUnique({ where: { code: promoCodeStr } });
    if (promo && promo.isActive && promo.uses < promo.maxUses) {
      if (!promo.expiresAt || promo.expiresAt > new Date()) {
        await tx.promoCode.update({
          where: { id: promo.id },
          data: { uses: { increment: 1 } }
        });
      }
    }
  }
}

export const marketingService = new MarketingService();
