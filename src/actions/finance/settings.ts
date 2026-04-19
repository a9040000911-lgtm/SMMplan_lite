'use server';

import { accountingService } from '@/services/financial/accounting.service';
import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const financeSettingsSchema = z.object({
  taxRate: z.coerce.number().optional().default(0),
  opexMonthly: z.coerce.number().optional().default(0)
});

export async function updateSystemSettings(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (user?.role !== 'ADMIN') throw new Error('Forbidden');

  const parsed = financeSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Validation error');
  const { taxRate, opexMonthly: opexRubles } = parsed.data;
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
