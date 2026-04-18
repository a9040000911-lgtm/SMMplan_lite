'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { auditAdmin } from '@/lib/admin-audit';
import { revalidatePath } from 'next/cache';

const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

async function requireStaff() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !STAFF_ROLES.includes(user.role)) throw new Error('Forbidden');
  return { session, user };
}

export async function updateSupportLimit(formData: FormData) {
  const { user: admin } = await requireStaff();
  
  if (!['OWNER', 'ADMIN'].includes(admin.role)) {
    throw new Error('Только Владелец может менять лимиты (Trust Budget)');
  }

  const userId = formData.get('userId') as string;
  const limitCents = parseInt(formData.get('limit') as string, 10);

  if (!userId || isNaN(limitCents)) {
    throw new Error('Invalid parameters');
  }

  const target = await db.user.findUniqueOrThrow({ where: { id: userId } });

  await db.user.update({
    where: { id: userId },
    data: { supportLimitCents: limitCents },
  });

  auditAdmin({
    adminId: admin.id,
    adminEmail: admin.email,
    action: 'UPDATE_TRUST_BUDGET',
    target: userId,
    targetType: 'USER',
    oldValue: { limit: target.supportLimitCents },
    newValue: { limit: limitCents },
  });

  revalidatePath('/admin/settings');
}
