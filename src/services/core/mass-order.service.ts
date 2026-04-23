import { db } from '@/lib/db';
import { marketingService } from '@/services/marketing.service';
import { orderService } from '@/services/core/order.service';
import { Decimal } from '@prisma/client/runtime/library';

export type MassOrderEntry = {
    serviceId: string;
    link: string;
    quantity: number;
    parsedValid: boolean;
};

export class MassOrderService {
    static parseText(text: string): MassOrderEntry[] {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        return lines.map(line => {
            // Expected format: serviceId | link | quantity
            const parts = line.split(/[\s|;,-]+/).filter(Boolean);
            if (parts.length < 3) return { serviceId: '', link: '', quantity: 0, parsedValid: false };
            
            const [serviceId, link, qtyStr] = parts;
            return {
                serviceId,
                link,
                quantity: parseInt(qtyStr, 10),
                parsedValid: !isNaN(parseInt(qtyStr, 10))
            };
        });
    }

    static async validateMassOrder(userId: string, projectId: string, entries: MassOrderEntry[]) {
        const validEntries = entries.filter(e => e.parsedValid);
        let totalCentAmount = 0;
        
        const validatedEntries = [];
        for (const entry of validEntries) {
            try {
                // Ensure service exists
                const service = await db.service.findUnique({ where: { id: entry.serviceId } });
                if (!service) continue;

                // Validate quantity
                if (entry.quantity < service.minQty || entry.quantity > service.maxQty) continue;

                // Calculate price
                const pricing = await marketingService.calculatePrice(userId, entry.serviceId, entry.quantity);
                totalCentAmount += pricing.totalCents;

                validatedEntries.push({
                    serviceId: entry.serviceId,
                    link: entry.link,
                    quantity: entry.quantity,
                    chargeCents: pricing.totalCents,
                    providerCostCents: pricing.providerCostCents
                });
            } catch (e) {
                // Ignore pricing errors for individual items in preview
            }
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        const hasSufficientBalance = user ? user.balance >= totalCentAmount : false;

        return {
            validatedEntries,
            totalBatchAmount: new Decimal(totalCentAmount / 100),
            hasSufficientBalance
        };
    }

    static async processMassOrder(userId: string, projectId: string, entries: any[]) {
        const preview = await this.validateMassOrder(userId, projectId, entries);
        if (preview.validatedEntries.length === 0) throw new Error('Нет валидных заказов для обработки');

        const totalChargeCents = preview.validatedEntries.reduce((sum, e) => sum + e.chargeCents, 0);

        // ATOMIC TRANSACTION: Protects against TOCTOU and Prisma connection pool exhaustion
        return await db.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: userId },
                data: { 
                    balance: { decrement: totalChargeCents },
                    totalSpent: { increment: totalChargeCents }
                }
            });

            if (user.balance < 0) {
                throw new Error('Недостаточно средств. Обработка прервана.');
            }

            // Map to Prisma schema explicitly to use createMany instead of 100 queries
            const orderData = preview.validatedEntries.map(e => ({
                userId,
                serviceId: e.serviceId,
                link: e.link,
                quantity: e.quantity,
                charge: e.chargeCents,
                providerCost: e.providerCostCents,
                status: 'PENDING',
                remains: e.quantity,
                isDripFeed: false
            }));

            // Efficient batch insert taking 1 Postgres connection instead of N
            await tx.order.createMany({
                data: orderData
            });

            await tx.ledgerEntry.create({
                data: {
                  userId,
                  amount: -totalChargeCents,
                  reason: `Массовый заказ (${orderData.length} позиций) через Telegram Bot`,
                  status: 'APPROVED'
                }
            });

            return {
                orderCount: orderData.length,
                totalAmount: preview.totalBatchAmount,
                batchId: `batch_${Date.now()}`
            };
        }, { isolationLevel: 'Serializable' });
    }
}
