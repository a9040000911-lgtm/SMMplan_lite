import { db } from '@/lib/db';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';
import { auditAdmin } from '@/lib/admin-audit';

// ── Types ──

export type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  balance: number;
  quarantineBalance: number;
  totalSpent: number;
  personalDiscount: number;
  referralCode: string | null;
  telegramId: string | null;
  createdAt: Date;
  _count: { orders: number; tickets: number };
};

export type UserCard = AdminUserRow & {
  orders: {
    id: string;
    numericId: number;
    status: string;
    charge: number;
    createdAt: Date;
    service: { name: string };
  }[];
  tickets: {
    id: string;
    subject: string;
    status: string;
    createdAt: Date;
  }[];
};

// ── Volume Tier Labels ──

function getVolumeTier(totalSpentCents: number): { name: string; color: string } {
  if (totalSpentCents >= 100_000_00) return { name: 'PLATINUM', color: 'bg-violet-100 text-violet-800' };
  if (totalSpentCents >= 25_000_00) return { name: 'GOLD', color: 'bg-amber-100 text-amber-800' };
  if (totalSpentCents >= 5_000_00) return { name: 'SILVER', color: 'bg-slate-200 text-slate-700' };
  if (totalSpentCents >= 1_000_00) return { name: 'BRONZE', color: 'bg-orange-100 text-orange-700' };
  return { name: 'REGULAR', color: 'bg-slate-100 text-slate-500' };
}

export { getVolumeTier };

// ── Service ──

export class AdminUserService {

  /**
   * Paginated user list with optional search (by email).
   */
  async listUsers(params: {
    cursor?: string;
    search?: string;
    pageSize?: number;
  }): Promise<PaginatedResult<AdminUserRow>> {
    const where: Record<string, unknown> = {};

    if (params.search?.trim()) {
      where.email = { contains: params.search.trim(), mode: 'insensitive' };
    }

    return paginatedQuery<AdminUserRow>(db.user, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true, tickets: true } },
      },
    });
  }

  /**
   * Full user card with recent orders and tickets.
   */
  async getUserCard(userId: string): Promise<UserCard> {
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        _count: { select: { orders: true, tickets: true } },
        orders: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            numericId: true,
            status: true,
            charge: true,
            createdAt: true,
            service: { select: { name: true } },
          },
        },
        tickets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            subject: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return user as unknown as UserCard;
  }

  /**
   * Adjust user balance with mandatory reason.
   * Writes to LedgerEntry for audit trail.
   */
  async updateBalance(
    userId: string,
    amountCents: number,
    reason: string,
    admin: { id: string; email: string }
  ) {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
    const oldBalance = user.balance;

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountCents } },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          adminId: admin.id,
          amount: amountCents,
          reason,
          status: 'APPROVED',
        },
      });
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BALANCE_CHANGE',
      target: userId,
      targetType: 'USER',
      oldValue: { balance: oldBalance },
      newValue: { balance: oldBalance + amountCents, delta: amountCents, reason },
    });
  }

  /**
   * Ban a user by setting role to 'BANNED'.
   */
  async banUser(userId: string, admin: { id: string; email: string }) {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.id === admin.id) throw new Error('Cannot ban yourself');

    await db.user.update({
      where: { id: userId },
      data: { role: 'BANNED' },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_BAN',
      target: userId,
      targetType: 'USER',
      oldValue: { role: user.role },
      newValue: { role: 'BANNED' },
    });
  }

  /**
   * Unban a user by restoring role to 'USER'.
   */
  async unbanUser(userId: string, admin: { id: string; email: string }) {
    await db.user.update({
      where: { id: userId },
      data: { role: 'USER' },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'USER_UNBAN',
      target: userId,
      targetType: 'USER',
      oldValue: { role: 'BANNED' },
      newValue: { role: 'USER' },
    });
  }

  /**
   * Get aggregate user stats for the header.
   */
  async getUserStats() {
    const [total, active, banned] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: { not: 'BANNED' } } }),
      db.user.count({ where: { role: 'BANNED' } }),
    ]);

    const totalBalance = await db.user.aggregate({ _sum: { balance: true } });

    return {
      total,
      active,
      banned,
      totalLiability: totalBalance._sum.balance || 0,
    };
  }
}

export const adminUserService = new AdminUserService();
