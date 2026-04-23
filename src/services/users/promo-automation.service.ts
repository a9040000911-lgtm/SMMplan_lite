import { db } from '@/lib/db';
import crypto from 'crypto';

export class PromoAutomationService {
  /**
   * Evaluates the user's total spend and instantly issues a unique promo code
   * if they cross certain financial thresholds. 
   * This is tied directly to the post-checkout lifecycle.
   */
  static async checkAndIssueLoyalty(userId: string) {
    try {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const totalSpentCents = user.totalSpent;

      // Define loyalty tiers and their reward discounts
      const rules = [
        { spendThreshold: 2500_00, percent: 5, description: 'Бонус за траты > 2500 RUB' },
        { spendThreshold: 10000_00, percent: 10, description: 'VIP Бонус за траты > 10,000 RUB' },
        { spendThreshold: 50000_00, percent: 15, description: 'КиТ Бонус за траты > 50,000 RUB' },
      ];

      for (const rule of rules) {
        if (totalSpentCents >= rule.spendThreshold) {
          // Idempotency: Ensure we don't issue the same bonus twice to the same user
          const uniqueHash = crypto.createHash('md5').update(userId).digest('hex').substring(0, 6).toUpperCase();
          const deterministicCode = `VIP${rule.percent}-${uniqueHash}`;

          const existing = await db.promoCode.findUnique({
            where: { code: deterministicCode }
          });

          if (!existing) {
            // Issue the Promo
            await db.promoCode.create({
              data: {
                code: deterministicCode,
                discountPercent: rule.percent,
                maxUses: 1, // One-time use reward
                isActive: true
              }
            });

            // Log it so admin or UI can see it was issued automatically
            await db.auditLog.create({
              data: {
                userId: userId,
                action: 'PROMO_ISSUED',
                details: `Автоматически выдан промокод ${deterministicCode} (${rule.percent}%) по правилу: ${rule.description}`
              }
            });

            // If we had an email or bot service wired up in Lite, we would broadcast here:
            // BotService.sendMessage(user.tgId, `Вам выпал бонус! ${deterministicCode}`);
          }
        }
      }
    } catch (e: any) {
      console.error(`PromoAutomationService Error for User ${userId}:`, e.message);
    }
  }
}
