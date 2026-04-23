import { Prisma } from '@prisma/client';

export type CreateOrderInput = {
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
  status: string;
  charge: number;       // totalCents
  providerCost: number; // providerCostCents
  runs?: number;
  interval?: number;
  email?: string;
  isTestMode?: boolean;
};

export class OrderService {
  /**
   * Universal method for creating a valid order within a Prisma transaction.
   * Handles business logic for Drip-Feed flags and numeric states natively.
   */
  async createOrderTransaction(tx: Prisma.TransactionClient, input: CreateOrderInput) {
    const isDripFeed = input.runs ? input.runs > 1 : false;
    
    return await tx.order.create({
      data: {
        userId: input.userId,
        serviceId: input.serviceId,
        link: input.link,
        quantity: input.quantity,
        status: input.status,
        charge: input.charge,
        providerCost: input.providerCost,
        remains: input.quantity,
        runs: input.runs,
        interval: input.interval,
        isDripFeed,
        nextRunAt: isDripFeed ? new Date() : null,
        email: input.email?.toLowerCase(),
        isTest: input.isTestMode || false,
      }
    });
  }

  /**
   * Fast secure path for Telegram Bot Orders.
   * Atomically deducts balance and creates an order, protected against TOCTOU.
   */
  async createBotOrder(userId: string, input: Omit<CreateOrderInput, 'userId' | 'status'>): Promise<{ success: boolean; error?: string; orderId?: string }> {
    try {
      // @ts-ignore - db import since this is a service
      const { db } = await import('@/lib/db');

      return await db.$transaction(async (tx: Prisma.TransactionClient) => {
        // 1. Unconditionally decrement balance
        const user = await tx.user.update({
          where: { id: userId },
          data: { 
            balance: { decrement: input.charge },
            totalSpent: { increment: input.charge }
          }
        });

        // 2. Strong guard against TOCTOU (or caught by PostgreSQL Constraint)
        if (user.balance < 0) {
          throw new Error('Not enough funds. Transaction aborted.');
        }

        // 3. Create Order
        const newOrder = await this.createOrderTransaction(tx, {
          ...input,
          userId,
          status: 'PENDING'
        });

        // 4. Ledger Entry
        await tx.ledgerEntry.create({
          data: {
            userId,
            amount: -input.charge,
            reason: `Списание средств за заказ #${newOrder.id} через Telegram Bot`,
            status: 'APPROVED'
          }
        });

        return { success: true, orderId: newOrder.id };
      }, { isolationLevel: 'Serializable' });

    } catch (e: any) {
      console.error('[BotOrder] Safe transaction failed:', e.message);
      return { success: false, error: 'Недостаточно средств или техническая ошибка' };
    }
  }
}

export const orderService = new OrderService();
