import { db } from '@/lib/db';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';
import { auditAdmin } from '@/lib/admin-audit';
import type { Order, User, Service, Category, Network } from '@prisma/client';

// ── Types ──

export type AdminOrderRow = Order & {
  user: Pick<User, 'id' | 'email'>;
  service: Pick<Service, 'id' | 'name' | 'numericId'> & {
    category: Pick<Category, 'name'> & {
      network: Pick<Network, 'name'> | null;
    };
  };
};

export type OrderSearchParams = {
  query?: string;
  status?: string;
  cursor?: string;
  pageSize?: number;
};

// ── Service ──

export class AdminOrderService {

  /**
   * Omni-Search: searches by email, link/URL, order numericId, or externalId.
   * Always returns paginated results via cursor.
   */
  async searchOrders(params: OrderSearchParams): Promise<PaginatedResult<AdminOrderRow>> {
    const { query, status, cursor, pageSize = 50 } = params;

    // Build dynamic WHERE clause
    const where: Record<string, unknown> = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (query && query.trim()) {
      const q = query.trim();
      const numericId = parseInt(q, 10);

      if (!isNaN(numericId) && q === String(numericId)) {
        // Pure number → search by numericId
        where.numericId = numericId;
      } else {
        // Clean URL to handle protocol mismatches
        const cleanSubstring = q.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        
        // Universal text search
        where.OR = [
          { externalId: { contains: q, mode: 'insensitive' } },
          { link: { contains: cleanSubstring, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
        ];
      }
    }

    return paginatedQuery<AdminOrderRow>(db.order, {
      cursor,
      pageSize,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        service: { 
          select: { 
            id: true, 
            name: true, 
            numericId: true,
            category: { select: { name: true, network: { select: { name: true } } } }
          } 
        },
      },
    });
  }

  /**
   * Cancel an order and refund the user's balance.
   * Partial refund: if order is IN_PROGRESS/PARTIAL with remains > 0,
   * refund only the undelivered portion.
   */
  async cancelOrder(orderId: string, admin: { id: string; email: string }) {
    const orderBefore = await db.order.findUniqueOrThrow({ where: { id: orderId } });

    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { user: true },
      });

      if (['COMPLETED', 'CANCELED'].includes(order.status)) {
        throw new Error(`Order ${order.numericId} is already ${order.status}`);
      }

      let refundCents = 0;
      if (order.status === 'AWAITING_PAYMENT' || order.status === 'PENDING' || order.status === 'IN_PROGRESS' || order.status === 'PARTIAL') {
          // If IN_PROGRESS but remains/quantity exists, we partially refund
          if (order.status === 'IN_PROGRESS' || order.status === 'PARTIAL') {
            if (order.remains > 0 && order.quantity > 0) {
               refundCents = Math.floor((order.remains / order.quantity) * order.charge);
            }
          } else {
             refundCents = order.charge; // For PENDING / AWAITING
          }
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED' },
      });

      if (refundCents > 0) {
        await tx.user.update({
          where: { id: order.userId },
          data: { balance: { increment: refundCents }, totalSpent: { decrement: refundCents } },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: order.userId,
            adminId: admin.id,
            amount: refundCents,
            reason: `Отмена заказа ${order.numericId} администратором - Возврат средств`,
            status: 'APPROVED'
          }
        });
      }

      return { refundCents, orderNumericId: order.numericId, statusBefore: order.status, remainsBefore: order.remains };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_CANCEL',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.statusBefore, remains: result.remainsBefore },
      newValue: { status: 'CANCELED', refundCents: result.refundCents },
    });

    return { refundCents: result.refundCents, orderNumericId: result.orderNumericId };
  }

  /**
   * Restart a failed/error order by resetting it to PENDING.
   * The provision worker will pick it up on next cycle.
   */
  async restartOrder(orderId: string, admin: { id: string; email: string }) {
    const result = await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { user: true }
      });

      if (order.status !== 'ERROR') {
        throw new Error(`Order ${order.numericId} cannot be restarted (status: ${order.status}). Используйте "Дублировать заказ".`);
      }

      const updatedUser = await tx.user.update({
        where: { id: order.userId },
        data: { balance: { decrement: order.charge }, totalSpent: { increment: order.charge } }
      });

      await tx.ledgerEntry.create({
        data: {
          userId: order.userId,
          adminId: admin.id,
          amount: -order.charge,
          reason: `Перезапуск заказа ${order.numericId} администратором - Повторное списание`,
          status: 'APPROVED'
        }
      });

      if (updatedUser.balance < 0) {
        throw new Error(`Недостаточно средств у пользователя для перезапуска. Необходимо ${(order.charge / 100).toFixed(2)} ₽.`);
      }

      // Reset order state
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING',
          error: null,
          retryCount: 0,
          externalId: null, // Clear stale provider ID
        },
      });

      return { orderNumericId: order.numericId, oldStatus: order.status, oldError: order.error, charge: order.charge };
    }, { isolationLevel: 'Serializable' });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_RESTART',
      target: orderId,
      targetType: 'ORDER',
      oldValue: { status: result.oldStatus, error: result.oldError },
      newValue: { status: 'PENDING', reChargeCents: result.charge },
    });

    return { orderNumericId: result.orderNumericId };
  }

  /**
   * Get order statistics for dashboard widgets.
   */
  async getOrderStats() {
    const [total, pending, inProgress, completed, error] = await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: 'PENDING' } }),
      db.order.count({ where: { status: 'IN_PROGRESS' } }),
      db.order.count({ where: { status: 'COMPLETED' } }),
      db.order.count({ where: { status: 'ERROR' } }),
    ]);

    return { total, pending, inProgress, completed, error };
  }
}

export const adminOrderService = new AdminOrderService();
