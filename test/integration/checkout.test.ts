import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type Service } from '@prisma/client';

vi.mock('next/headers', () => ({
  headers: () => new Map([['x-forwarded-for', '127.0.0.1']])
}));
import { db } from '@/lib/db';
import { calculatePriceAction, checkoutAction } from '@/actions/order/checkout';

describe('Server Actions: Checkout Integration', () => {
  let service: Service;

  beforeEach(async () => {
    // Relying on global setup to TRUNCATE DB
    
    // Enable test mode in DB so it doesn't crash on Payment Gateways
    await db.systemSettings.create({
      data: { isTestMode: true }
    });

    const category = await db.category.create({
      data: { name: 'Action Testing' }
    });

    service = await db.service.create({
      data: {
        name: 'Organic Followers',
        categoryId: category.id,
        rate: 50, // 50 RUB 
        markup: 3, // total price 150 RUB per 1k = 15000 cents
        minQty: 100,
        maxQty: 5000,
        isActive: true,
        externalId: 'ext_777'
      }
    });
  });

  it('Calculates correct preview price (calculatePriceAction)', async () => {
    // 500 followers at 150 RUB/1k = 75 RUB = 7500 cents
    const res = await calculatePriceAction(service.id, 500);
    expect(res.error).toBeUndefined();
    expect(res.data?.totalCents).toBe(7500);
  });

  it('Creates order transaction and returns mock url (checkoutAction)', async () => {
    const res = await checkoutAction({
      serviceId: service.id,
      link: 'https://mysite.com',
      quantity: 500,
      email: 'buyer@example.com',
      gateway: 'yookassa'
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.paymentUrl).toContain('/api/dev/mock-payment');
    }
    
    // Check DB
    const orderInDb = await db.order.findFirst({ where: { email: 'buyer@example.com' } });
    expect(orderInDb).toBeDefined();
    expect(orderInDb?.status).toBe('AWAITING_PAYMENT');
    expect(orderInDb?.charge).toBe(7500);
    expect(orderInDb?.providerCost).toBe(2500); // 500 * (50/1000) = 25 RUB = 2500 cents
  });

  it('Refuses to create order out of bounds', async () => {
    const res = await checkoutAction({
      serviceId: service.id,
      link: 'https://mysite.com',
      quantity: 5, // < minQty 100
      email: 'buyer@example.com',
      gateway: 'yookassa'
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('Quantity must be between'); // This might be handled differently depending on the Zod validation message, but keeping as is
    }
  });

  it('Creates order transaction with cryptobot gateway', async () => {
    const res = await checkoutAction({
      serviceId: service.id,
      link: 'https://mysite.com',
      quantity: 500,
      email: 'buyer_crypto@example.com',
      gateway: 'cryptobot'
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.paymentUrl).toContain('/api/dev/mock-payment');
    }
  });

  it('Triggers RateLimit after 15 fast checkouts', async () => {
    // 1 checkout was already done above, and it hits "checkoutCore" globally. Let's do 15 more to ensure 429.
    let blockedResponse;
    for (let i = 0; i < 16; i++) {
      const res = await checkoutAction({
        serviceId: service.id,
        link: 'https://site.com',
        quantity: 100, // min Qty
        email: `spammer${i}@test.com`,
        gateway: 'yookassa'
      });
      if (!res.success && res.error === 'Слишком много запросов. Попробуйте через минуту.') {
        blockedResponse = res;
        break;
      }
    }
    expect(blockedResponse).toBeDefined();
    expect(blockedResponse?.success).toBe(false);
  });
});
