import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { sendAdminAlert } from '@/lib/notifications';

interface AdminContext {
  id: string;
  email: string;
  role: string;
  supportLimitCents: number;
}

/**
 * Returns the start of today in Moscow timezone (UTC+3).
 * All daily trust budget calculations anchor to 00:00 MSK.
 */
function getMSKMidnightUTC(): Date {
  const now = new Date();
  // Current MSK time components
  const mskOffsetMs = 3 * 60 * 60 * 1000;
  const mskNow = new Date(now.getTime() + mskOffsetMs);
  // Midnight MSK in UTC = today's MSK date at 00:00 minus the offset
  return new Date(Date.UTC(mskNow.getUTCFullYear(), mskNow.getUTCMonth(), mskNow.getUTCDate()) - mskOffsetMs);
}

export class EscrowService {
  /**
   * Evaluates if a manual balance adjustment should be approved immediately 
   * or placed into Escrow Quarantine, based on the Admin's RBAC role and limits.
   * 
   * Business rules:
   * - OWNER/ADMIN: bypass all limits, always APPROVED
   * - Negative amounts (refunds/chargebacks): bypass limits, always APPROVED with logging
   * - SUPPORT/MANAGER positive amounts: checked against daily Trust Budget (supportLimitCents)
   *   - Daily window resets at 00:00 MSK
   */
  async evaluateBalanceAdjustment(
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    const isOwnerOrAdmin = admin.role === 'OWNER' || admin.role === 'ADMIN';

    // 2. Owners and Admins bypass all Escrow trust limits
    if (isOwnerOrAdmin || amountCents < 0) {
      return this.executeApprovedAdjustment(targetUserId, amountCents, reason, admin);
    }

    const todayMSK = getMSKMidnightUTC();

    // 3. To prevent state-bypass (race conditions), we must evaluate and execute 
    // the trust budget check atomically using Serializable isolation.
    try {
      return await db.$transaction(async (tx) => {
        const todayEntries = await tx.ledgerEntry.findMany({
          where: {
            adminId: admin.id,
            createdAt: { gte: todayMSK },
            amount: { gt: 0 } 
          },
          select: { amount: true },
        });

        const totalVolumeToday = todayEntries.reduce((sum, entry) => sum + entry.amount, 0);

        if (totalVolumeToday + amountCents > admin.supportLimitCents) {
          return await this.executeQuarantineAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
        }

        return await this.executeApprovedAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
      }, { isolationLevel: 'Serializable' });
    } catch (error: any) {
      if (error.code === 'P2034') {
        throw new Error("Транзакция отклонена: Баланс пользователя изменяется в данный момент. Повторите попытку.");
      }
      throw error;
    }
  }

  private async executeApprovedAdjustment(
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    return db.$transaction(async (tx) => {
      return await this.executeApprovedAdjustmentTx(tx, targetUserId, amountCents, reason, admin);
    }, { isolationLevel: 'Serializable' });
  }

  private async executeApprovedAdjustmentTx(
    tx: any,
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: targetUserId } });
    const oldBalance = user.balance;
    const newBalance = oldBalance + amountCents;

    // Warn if balance goes negative
    if (newBalance < 0) {
      sendAdminAlert(`⚠️ Внимание: Баланс клиента ${user.email} уйдёт в минус (${(newBalance / 100).toFixed(2)} ₽) после операции на ${(amountCents / 100).toFixed(2)} ₽.`, 'WARNING');
    }

    await tx.user.update({
      where: { id: targetUserId },
      data: { balance: { increment: amountCents } },
    });

    await tx.ledgerEntry.create({
      data: {
        userId: targetUserId,
        adminId: admin.id,
        amount: amountCents,
        reason,
        status: 'APPROVED',
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_CHANGE',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { balance: oldBalance },
      newValue: { balance: newBalance, delta: amountCents, reason, status: 'AUTO_APPROVED' },
    });
  }

  private async executeQuarantineAdjustmentTx(
    tx: any,
    targetUserId: string,
    amountCents: number,
    reason: string,
    admin: AdminContext
  ) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: targetUserId } });

    // Add funds to the quarantine bubble instead of main balance
    await tx.user.update({
      where: { id: targetUserId },
      data: { quarantineBalance: { increment: amountCents } },
    });

    await tx.ledgerEntry.create({
      data: {
        userId: targetUserId,
        adminId: admin.id,
        amount: amountCents,
        reason,
        status: 'QUARANTINE',
      },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_QUARANTINED',
      target: targetUserId,
      targetType: 'USER',
      oldValue: { quarantineBalance: user.quarantineBalance },
      newValue: { 
        quarantineBalance: user.quarantineBalance + amountCents, 
        delta: amountCents, 
        reason, 
        status: 'QUARANTINE' 
      },
    });

    // Alert Owner
    const formatMoney = (c: number) => (c / 100).toFixed(2);
    sendAdminAlert(
      `Сработал лимит Escrow Guard.\n\nСотрудник: ${admin.email}\nСумма: ${formatMoney(amountCents)} ₽\nКому: ${user.email}\nПричина: ${reason}\n\nТребуется подтверждение Владельца.`,
      'CRITICAL'
    );
  }

  /**
   * Fetch all pending quarantine transactions for the dashboard
   */
  async getQuarantineEntries() {
    const entries = await db.ledgerEntry.findMany({
      where: { status: 'QUARANTINE' },
      orderBy: { createdAt: 'desc' },
    });

    const userIds = Array.from(new Set(entries.map(e => e.userId)));
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    
    const userMap = new Map(users.map(u => [u.id, u.email]));

    return entries.map(entry => ({
      ...entry,
      userEmail: userMap.get(entry.userId) || entry.userId,
    }));
  }

  /**
   * Resolve a quarantined transaction (Owner/Admin only).
   * Uses atomic WHERE clause to prevent double-resolve race condition.
   */
  async resolveQuarantine(
    entryId: string,
    resolution: 'APPROVE' | 'REJECT',
    owner: { id: string; email: string }
  ) {
    // Atomic check-and-update: only proceed if status is still QUARANTINE.
    // This prevents the race condition where two Owners click Approve simultaneously.
    await db.$transaction(async (tx) => {
      const updatedEntries = await tx.ledgerEntry.updateMany({
        where: { id: entryId, status: 'QUARANTINE' },
        data: { status: resolution },
      });

      if (updatedEntries.count === 0) {
        throw new Error('Entry already resolved or not found');
      }

      const entry = await tx.ledgerEntry.findUniqueOrThrow({ where: { id: entryId } });
      const user = await tx.user.findUniqueOrThrow({ where: { id: entry.userId } });

      await tx.user.update({
        where: { id: entry.userId },
        data: { quarantineBalance: { decrement: entry.amount } },
      });

      if (resolution === 'APPROVE') {
        await tx.user.update({
          where: { id: entry.userId },
          data: { balance: { increment: entry.amount } },
        });
      }

      await tx.adminAuditLog.create({
        data: {
          adminId: owner.id,
          adminEmail: owner.email,
          action: `QUARANTINE_${resolution}`,
          target: entry.id,
          targetType: 'LEDGER',
          oldValue: JSON.stringify({ status: 'QUARANTINE', userQuarantine: user.quarantineBalance, userBalance: user.balance }),
          newValue: JSON.stringify({
            status: resolution,
            userQuarantine: user.quarantineBalance - entry.amount,
            userBalance: resolution === 'APPROVE' ? user.balance + entry.amount : user.balance,
          }),
        }
      });
    });
  }
}

export const escrowService = new EscrowService();
