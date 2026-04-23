import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { adminEscrowService } from '@/services/admin/escrow.service';

describe('Admin Escrow Service (Security)', () => {
  let targetUser: any;
  let adminUser: any;

  beforeEach(async () => {
    targetUser = await db.user.create({
      data: {
        email: 'target.escrow_' + Date.now() + '@test.com',
        balance: 0,
      }
    });

    adminUser = await db.user.create({
      data: {
        email: 'admin.escrow_' + Date.now() + '@test.com',
        role: 'MANAGER',
        supportLimitCents: 1000 // Only 10 RUB max per day
      }
    });
  });

  it('Blocks double-crediting race conditions (Serializable Isolation)', async () => {
    // Generate 5 simultaneous requests of 900 cents each.
    // Individually, 900 <= 1000, so it passes.
    // But together they equal 4500 cents, exceeding the 1000 limit.
    const promises = Array.from({ length: 5 }).map(() =>
      adminEscrowService.evaluateBalanceAdjustment(
        targetUser.id,
        900,
        'Test race condition bypass',
        adminUser
      )
    );

    const outcomes = await Promise.allSettled(promises);

    let successCount = 0;
    let failCount = 0;

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') {
        successCount++;
      } else {
        // We expect P2034 (Write conflict) or standard "Daily limit exceeded" error
        failCount++;
      }
    }

    // Only strictly 1 transaction should have succeeded because of Serializable Isolation
    expect(successCount).toBe(1);
    expect(failCount).toBe(4);

    // Verify DB State
    const checkDbUser = await db.user.findUnique({ where: { id: targetUser.id } });
    
    // Admin was authorized to send 900. Only 1 request succeeded, so target balance must be 900.
    expect(checkDbUser?.balance).toBe(900);
    
    // Furthermore, checking daily volume should confirm it is 900.
    const ledgers = await db.ledgerEntry.findMany({
      where: { adminId: adminUser.id, amount: { gt: 0 } }
    });
    
    const sum = ledgers.reduce((acc, l) => acc + l.amount, 0);
    expect(sum).toBe(900);
  });
});
