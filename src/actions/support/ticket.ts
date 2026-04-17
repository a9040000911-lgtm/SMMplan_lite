'use server';

import { verifySession } from '@/lib/session';
import { ticketService } from '@/services/support/ticket.service';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createTicket(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;

  if (!subject || !message) return;

  const ticket = await ticketService.getOrCreateTicket(session.userId, subject);
  await ticketService.addMessage(ticket.id, 'USER', message);

  revalidatePath('/dashboard/tickets');
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function addTicketMessage(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const ticketId = formData.get('ticketId') as string;
  const message = formData.get('message') as string;
  
  if (!ticketId || !message) return;

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

  const ticketId = formData.get('ticketId') as string;
  const message = formData.get('message') as string;
  const isInternal = formData.get('isInternal') === 'true';

  const sender = isInternal ? 'INTERNAL' : 'STAFF';
  
  if (!ticketId || !message) return;

  await ticketService.addMessage(ticketId, sender, message);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}
