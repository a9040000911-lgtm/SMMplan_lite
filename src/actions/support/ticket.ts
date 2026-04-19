'use server';

import { verifySession } from '@/lib/session';
import { ticketService } from '@/services/support/ticket.service';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const createTicketSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1)
});

const ticketMessageSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1)
});

const adminReplySchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1),
  isInternal: z.any().transform(val => val === 'true' || val === 'on')
});

export async function createTicket(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const parsed = createTicketSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { subject, message } = parsed.data;

  const ticket = await ticketService.getOrCreateTicket(session.userId, subject);
  await ticketService.addMessage(ticket.id, 'USER', message);

  revalidatePath('/dashboard/tickets');
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function addTicketMessage(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const parsed = ticketMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { ticketId, message } = parsed.data;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== session.userId) throw new Error('Forbidden');

  await ticketService.addMessage(ticketId, 'USER', message);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function adminReplyTicket(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT'].includes(user.role)) throw new Error('Forbidden');

  const parsed = adminReplySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { ticketId, message, isInternal } = parsed.data;

  const sender = isInternal ? 'INTERNAL' : 'STAFF';

  await ticketService.addMessage(ticketId, sender, message);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}
