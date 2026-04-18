import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { POST } from '@/app/api/v2/route';
import { NextRequest } from 'next/server';

describe('Security & Concurrency (Race Conditions)', () => {
  let user: any;
  let service: any;

  beforeEach(async () => {
    // 1. Seed user with precisely enough balance for ONLY 1 order
    user = await db.user.create({
      data: {
        email: 'race.user@test.com',
        apiKey: 'RACE_SECRET_123',
        balance: 15000, // 150 RUB
      }
    });

    const category = await db.category.create({
      data: { name: 'Race Test Services', platform: 'Telegram' }
    });

    // 2. Seed a service with fixed cost
    service = await db.service.create({
      data: {
        name: 'API Service Race',
        categoryId: category.id,
        rate: 100, 
        markup: 1.5, // Total cost per 1k should be 150 RUB = 15000 cents
        minQty: 10,
        maxQty: 10000,
        isActive: true,
        numericId: 999
      }
    });

    // Disable rate limiting for this user to allow parallel execution test
    await db.rateLimit.deleteMany();
  });

  const makeRequest = async (payload: Record<string, string>) => {
    const searchParams = new URLSearchParams(payload);
    const req = new NextRequest('http://localhost/api/v2', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: searchParams
    });
    return POST(req);
  };

  it('Prevents balance dropping below zero on parallel B2B requests (Double Spend Attack)', async () => {
    // Launch 10 simultaneous requests to buy a 1k item.
    // The user ONLY has enough balance for 1 item (15000 cents).
    
    // Create an array of 10 promises running exactly at the same time
    const promises = Array.from({ length: 10 }).map(() => makeRequest({ 
      key: user.apiKey, 
      action: 'add',
      service: '999',
      link: 'https://example.com/race',
      quantity: '1000' 
    }));

    const responses = await Promise.all(promises);

    let successCount = 0;
    let failCount = 0;

    for (const res of responses) {
      if (res.status === 200) {
        successCount++;
      } else if (res.status === 400) {
        failCount++;
      }
    }

    // Only 1 transaction should have succeeded, the rest should fail with INSUFFICIENT_FUNDS
    expect(successCount).toBe(1);
    expect(failCount).toBe(9);

    // Verify DB
    const checkDbUser = await db.user.findUnique({ where: { id: user.id } });
    expect(checkDbUser?.balance).toBe(0); // 15000 - 15000
    
    // Only 1 order should have been created
    const orders = await db.order.count({ where: { userId: user.id } });
    expect(orders).toBe(1);
  });
});
