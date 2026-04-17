'use server';

import { accountingService } from '@/services/financial/accounting.service';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateSystemSettings(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (user?.role !== 'ADMIN') throw new Error('Forbidden');

  const taxRate = parseFloat(formData.get('taxRate') as string) || 0;
  const opexRubles = parseFloat(formData.get('opexMonthly') as string) || 0;
  const opexMonthly = Math.round(opexRubles * 100);

  await accountingService.updateSettings(taxRate, opexMonthly);
  
  await db.auditLog.create({
    data: {
      userId: session.userId,
      action: 'UPDATE_FINANCE_SETTINGS',
      details: `Updated taxRate to ${taxRate}%, opexMonthly to ${opexRubles} RUB`
    }
  });

  revalidatePath('/admin/finance');
}
