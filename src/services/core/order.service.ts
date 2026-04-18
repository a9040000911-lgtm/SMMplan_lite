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
}

export const orderService = new OrderService();
