import { db } from '@/lib/db';

export const adminMarketingService = {
  // ── PromoCodes ──
  async listPromoCodes() {
    return db.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async createPromoCode(data: {
    code: string;
    type: 'DISCOUNT' | 'VOUCHER';
    discountPercent?: number;
    amount?: number;
    maxUses: number;
    expiresAt?: Date | null;
  }) {
    return db.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        discountPercent: data.discountPercent || 0,
        amount: data.amount || 0,
        maxUses: data.maxUses,
        expiresAt: data.expiresAt,
        isActive: true,
      },
    });
  },

  async togglePromoCode(id: string, isActive: boolean) {
    return db.promoCode.update({
      where: { id },
      data: { isActive },
    });
  },

  async deletePromoCode(id: string) {
    return db.promoCode.delete({
      where: { id },
    });
  },

  // ── Referrals & Commissions ──
  async getReferralStats() {
    const totalCommissions = await db.commission.aggregate({
      _sum: { amount: true },
      where: { status: 'PAID' },
    });

    const pendingCommissions = await db.commission.aggregate({
      _sum: { amount: true },
      where: { status: 'PENDING' },
    });

    return {
      totalPaidOut: totalCommissions._sum.amount || 0,
      totalPending: pendingCommissions._sum.amount || 0,
    };
  },

  async listTopReferrers() {
    // Find users with the highest referral balance or most referrals
    return db.user.findMany({
      where: { referralBalance: { gt: 0 } },
      orderBy: { referralBalance: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        referralCode: true,
        referralBalance: true,
        _count: {
          select: { referrals: true, commissions: true },
        },
      },
    });
  },

  async processPayout(userId: string, adminId: string, amountToPayCents: number) {
    // Transaction to move referral balance to main balance
    return db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');
      if (user.referralBalance < amountToPayCents) {
        throw new Error('Insufficient referral balance');
      }

      // Deduct from referral
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          referralBalance: { decrement: amountToPayCents },
          balance: { increment: amountToPayCents },
        },
      });

      // Mark all pending commissions for this user as PAID (simplified approach, or we could leave them as is if we just treat balance as an aggregate container)
      await tx.commission.updateMany({
        where: { referrerId: userId, status: 'PENDING' },
        data: { status: 'PAID' },
      });

      // Audit Log
      await tx.adminAuditLog.create({
        data: {
          adminId: adminId,
          adminEmail: 'System', // Will map to real in action
          action: 'REFERRAL_PAYOUT',
          target: userId,
          targetType: 'USER',
          newValue: JSON.stringify({ amount: amountToPayCents, newBalance: updatedUser.balance }),
        },
      });

      return updatedUser;
    });
  },
};
