'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminMarketingService } from '@/services/admin/marketing.service';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const promoCodeSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['DISCOUNT', 'VOUCHER']),
  discountPercent: z.coerce.number().optional().default(0),
  amount: z.coerce.number().int().optional().default(0),
  maxUses: z.coerce.number().int().optional().default(1),
  expiresAt: z.string().optional().transform(v => v ? new Date(v) : null)
});

async function requireAdmin() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN' && user.role !== 'OWNER') throw new Error('Forbidden');
  return { session, user };
}

export async function createPromoCode(formData: FormData) {
  const { session } = await requireAdmin();
  
  const parsed = promoCodeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error('Некорректные данные промокода: ' + parsed.error.errors.map(e => e.message).join(', '));
  }
  const { code, type, discountPercent, amount, maxUses, expiresAt } = parsed.data;

  await adminMarketingService.createPromoCode({
    code,
    type,
    discountPercent,
    amount,
    maxUses,
    expiresAt,
  });

  await db.adminAuditLog.create({
    data: {
      adminId: session.userId,
      adminEmail: 'System', // Typically would derive from user email
      action: 'PROMOCODE_CREATE',
      target: code,
      targetType: 'PROMO',
      newValue: `Type: ${type}, Max: ${maxUses}`
    }
  });

  revalidatePath('/admin/marketing');
}

export async function togglePromoCode(id: string, isActive: boolean) {
  const { session, user } = await requireAdmin();
  await adminMarketingService.togglePromoCode(id, isActive);
  auditAdmin({
    adminId: user.id,
    adminEmail: user.email,
    action: isActive ? 'PROMOCODE_ENABLE' : 'PROMOCODE_DISABLE',
    target: id,
    targetType: 'SETTINGS',
  });
  revalidatePath('/admin/marketing');
}

export async function processReferralPayout(userId: string, amount: number) {
  const { session, user } = await requireAdmin();
  await adminMarketingService.processPayout(userId, session.userId, amount);
  auditAdmin({
    adminId: user.id,
    adminEmail: user.email,
    action: 'REFERRAL_PAYOUT',
    target: userId,
    targetType: 'USER',
    newValue: { amountCents: amount },
  });
  revalidatePath('/admin/marketing');
}
