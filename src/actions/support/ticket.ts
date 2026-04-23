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
  message: z.string().optional(),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional()
}).refine(data => data.message || data.mediaUrl, "Either message or mediaUrl must be provided");

const adminReplySchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().optional(),
  isInternal: z.any().transform(val => val === 'true' || val === 'on'),
  mediaUrl: z.string().optional(),
  mediaType: z.string().optional()
}).refine(data => data.message || data.mediaUrl, "Either message or mediaUrl must be provided");

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
  const { ticketId, message, mediaUrl, mediaType } = parsed.data;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.userId !== session.userId) throw new Error('Forbidden');

  await ticketService.addMessage(ticketId, 'USER', message || '', mediaUrl, mediaType);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
}

export async function adminReplyTicket(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = adminReplySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { ticketId, message, isInternal, mediaUrl, mediaType } = parsed.data;

  const sender = isInternal ? 'INTERNAL' : 'STAFF';

  await ticketService.addMessage(ticketId, sender, message || '', mediaUrl, mediaType);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}

const changeStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED'])
});

export async function changeTicketStatus(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = changeStatusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { ticketId, status } = parsed.data;

  await db.ticket.update({
    where: { id: ticketId },
    data: { status }
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/admin/tickets`);
}

const editMessageSchema = z.object({
  messageId: z.string().min(1),
  newText: z.string().min(1)
});

export async function editTicketMessage(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = editMessageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;
  const { messageId, newText } = parsed.data;

  // Retrieve the old message
  const msg = await db.ticketMessage.findUnique({ where: { id: messageId } });
  if (!msg) throw new Error('Message not found');

  if (msg.sender === 'USER') {
    throw new Error('You cannot edit user messages');
  }

  // Transaction for updating text and auditing
  await db.$transaction(async (tx) => {
    await tx.ticketMessage.update({
      where: { id: messageId },
      data: { text: newText.trim() }
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: user.id,
        adminEmail: user.email,
        action: 'TICKET_MESSAGE_EDITED',
        target: msg.id,
        targetType: 'TICKET_MESSAGE',
        oldValue: msg.text,
        newValue: newText.trim(),
        ipAddress: 'internal'
      }
    });
  });

  revalidatePath(`/admin/tickets/${msg.ticketId}`);
}
