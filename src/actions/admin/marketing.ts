'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminMarketingService } from '@/services/admin/marketing.service';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN' && user.role !== 'OWNER') throw new Error('Forbidden');
  return { session, user };
}

export async function createPromoCode(formData: FormData) {
  const { session } = await requireAdmin();
  
  const code = formData.get('code') as string;
  const type = formData.get('type') as 'DISCOUNT' | 'VOUCHER';
  const discountPercent = parseFloat(formData.get('discountPercent') as string) || 0;
  const amount = parseInt(formData.get('amount') as string, 10) || 0;
  const maxUses = parseInt(formData.get('maxUses') as string, 10) || 1;
  const expiresAtStr = formData.get('expiresAt') as string;
  const expiresAt = expiresAtStr ? new Date(expiresAtStr) : null;

  if (!code || !type) return;

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
      details: `Type: ${type}, Max: ${maxUses}`
    }
  });

  revalidatePath('/admin/marketing');
}

export async function togglePromoCode(id: string, isActive: boolean) {
  const { session } = await requireAdmin();
  await adminMarketingService.togglePromoCode(id, isActive);
  revalidatePath('/admin/marketing');
}

export async function processReferralPayout(userId: string, amount: number) {
  const { session } = await requireAdmin();
  await adminMarketingService.processPayout(userId, session.userId, amount);
  revalidatePath('/admin/marketing');
}
