'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const compensationSchema = z.object({
  ticketId: z.string().min(1),
  costRub: z.number().positive(),
  note: z.string().min(3)
});

export async function logManualCompensation(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) {
    throw new Error('Forbidden');
  }

  const parsed = compensationSchema.safeParse({
    ticketId: formData.get('ticketId'),
    costRub: parseFloat(formData.get('costRub') as string),
    note: formData.get('note')
  });

  if (!parsed.success) {
    throw new Error('Invalid input');
  }

  const { ticketId, costRub, note } = parsed.data;
  const costCents = Math.round(costRub * 100);

  // OWNER has infinite limit effectively. For others, check limits.
  const isOwner = user.role === 'OWNER';
  if (!isOwner && user.supportLimitCents < costCents) {
    throw new Error('Недостаточно лимита доверия');
  }

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { userId: true, id: true }
  });

  if (!ticket) throw new Error('Ticket not found');

  // Perform operations in a transaction
  await db.$transaction(async (tx) => {
    // 1. Deduct limit if not owner
    if (!isOwner) {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { supportLimitCents: { decrement: costCents } }
      });
      if (updatedUser.supportLimitCents < 0) {
        throw new Error('Недостаточно лимита доверия. Обнаружена конкурентная транзакция.');
      }
    }

    // 2. Write to LedgerEntry
    await tx.ledgerEntry.create({
      data: {
        userId: ticket.userId,
        adminId: user.id,
        amount: -costCents, // Negative meaning company lost money (expense)
        reason: `Ручной докрут: ${note}`,
        status: 'APPROVED'
      }
    });

    // 3. Write AdminAuditLog
    await tx.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'MANUAL_REFILL_COMPENSATION',
        target: ticket.id,
        targetType: 'TICKET',
        oldValue: JSON.stringify({ supportLimitCents: user.supportLimitCents }),
        newValue: JSON.stringify({ supportLimitCents: isOwner ? user.supportLimitCents : user.supportLimitCents - costCents }),
        ipAddress: 'internal'
      }
    });

    // 4. Inject silent message to ChatWindow
    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        sender: 'INTERNAL',
        text: `[СИСТЕМА] Сотрудник (${user.email}) оформил ручную компенсацию. Потрачено: ${costRub.toLocaleString('ru-RU')} ₽.\nКомментарий: ${note}`
      }
    });
  });

  revalidatePath('/admin/tickets');
  revalidatePath(`/admin/tickets/${ticketId}`, 'page');
}
