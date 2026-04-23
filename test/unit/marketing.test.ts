import { describe, it, expect, beforeEach } from 'vitest';
import { marketingService } from '@/services/marketing.service';
import { db } from '@/lib/db';

describe('Financial Core: Marketing Service', () => {
  let testServiceId: string;
  let testUserId: string;

  beforeEach(async () => {
    const service = await db.service.create({
      data: {
        name: 'Test Service',
        externalId: 'ext-123',
        rate: 5.0, // Base provider cost is $5.00 per 1000 = 500 Cents
        minQty: 10,
        maxQty: 1000,
        markup: 5.0,
        isActive: true,
        category: {
          create: {
            name: 'Test Category',
            sort: 0
          }
        }
      }
    });
    testServiceId = service.id;

    const user = await db.user.create({
       data: { email: 'test@example.com', role: 'USER' }
    });
    testUserId = user.id;

    await db.promoCode.create({
      data: {
        code: 'SALE50',
        discountPercent: 50.0,
        uses: 0,
        maxUses: 100,
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
        isActive: true
      }
    });

    await db.systemSettings.create({
      data: { id: 'global', siteName: 'Test' }
    });
  });

  it('Calculates base price correctly without discounts', async () => {
    // Quantity 1000. Base rate is $5.00. Converted to RUB: 5 * 95 = 475 RUB = 47500 Cents.
    // Markup is 5.0. 47500 * 5.0 = 237500 Cents
    const result = await marketingService.calculatePrice(null, testServiceId, 1000);
    
    expect(result.providerCostCents).toBe(47500); // 475.00 RUB
    expect(result.originalTotalCents).toBe(237500); // 2375.00 RUB
    expect(result.totalCents).toBe(237500); 
  });

  it('Applies standard 50% promo code correctly', async () => {
    const result = await marketingService.calculatePrice(null, testServiceId, 1000, 'SALE50');
    
    expect(result.providerCostCents).toBe(47500);
    expect(result.originalTotalCents).toBe(237500);
    // 50% discount capped at MAX_TOTAL_DISCOUNT (30%) = 166250
    expect(result.totalCents).toBe(166250); 
    expect(result.discountPercent).toBe(30);
  });

  it('Calculates fractions correctly (e.g. quantity 50)', async () => {
    // 50 / 1000 = 0.05. 
    // cost = 47500 * 0.05 = 2375.
    // sell = 237500 * 0.05 = 11875.
    const result = await marketingService.calculatePrice(null, testServiceId, 50);
    
    expect(result.providerCostCents).toBe(2375);
    expect(result.originalTotalCents).toBe(11875);
    expect(result.totalCents).toBe(11875);
  });
});
