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
        markup: 2.0,
        isActive: true,
        category: {
          create: {
            name: 'Test Category',
            platform: 'Test',
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
    // Quantity 1000. Base rate is 500 (Provider) * 2.0 (Markup) = 1000 Cents
    const result = await marketingService.calculatePrice(null, testServiceId, 1000);
    
    expect(result.providerCostCents).toBe(500); // $5.00 
    expect(result.originalTotalCents).toBe(1000); // 1000 Cents
    expect(result.totalCents).toBe(1000); // 1000 Cents
  });

  it('Applies standard 50% promo code correctly', async () => {
    const result = await marketingService.calculatePrice(null, testServiceId, 1000, 'SALE50');
    
    expect(result.providerCostCents).toBe(500);
    expect(result.originalTotalCents).toBe(1000);
    expect(result.totalCents).toBe(500); // 50% of 1000 = 500
    expect(result.discountPercent).toBe(50);
  });

  it('Calculates fractions correctly (e.g. quantity 50)', async () => {
    // 50 / 1000 = 0.05. 
    // cost = 500 * 0.05 = 25.
    // sell = 1000 * 0.05 = 50.
    const result = await marketingService.calculatePrice(null, testServiceId, 50);
    
    expect(result.providerCostCents).toBe(25);
    expect(result.originalTotalCents).toBe(50);
    expect(result.totalCents).toBe(50);
  });
});
