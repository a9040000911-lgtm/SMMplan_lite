'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { ticketService } from '@/services/support/ticket.service';
import { revalidatePath } from 'next/cache';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';

const mediaSchema = z.object({
  ticketId: z.string().min(1),
  file: z.instanceof(File),
  text: z.string().optional().default('')
});

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm'],
};

const MAX_SIZE: Record<string, number> = {
  image: 5 * 1024 * 1024,   // 5MB
  video: 15 * 1024 * 1024,  // 15MB
};

export async function uploadMedia(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const parsed = mediaSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing ticketId or file');
  const { ticketId, file, text } = parsed.data;

  // Verify ticket access
  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new Error('Unauthorized');

  const isStaff = ['ADMIN', 'SUPPORT'].includes(user.role);
  if (ticket.userId !== session.userId && !isStaff) throw new Error('Forbidden');

  // Determine media type
  let mediaType: string | null = null;
  for (const [type, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(file.type)) {
      mediaType = type;
      break;
    }
  }
  if (!mediaType) throw new Error(`File type not allowed: ${file.type}`);

  // Validate size
  const maxSize = MAX_SIZE[mediaType] || 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error(`File too large. Max: ${maxSize / 1024 / 1024}MB`);

  // Save to private/uploads/tickets/{ticketId}/{filename}
  const uploadDir = path.join(process.cwd(), 'private', 'uploads', 'tickets', ticketId);
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = file.name.split('.').pop() || 'bin';
  const safeFilename = `${Date.now()}.${ext.replace(/[^a-zA-Z0-9]/g, '')}`;
  const filePath = path.join(uploadDir, safeFilename);

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await fs.writeFile(filePath, buffer);
  } catch (e: any) {
    throw new Error(`Upload failed: ${e.message}`, { cause: e });
  }

  const mediaUrl = `tickets/${ticketId}/${safeFilename}`;
  const sender = isStaff ? 'STAFF' : 'USER';

  await db.ticketMessage.create({
    data: { ticketId, sender, text: text || `📎 ${file.name}`, mediaUrl, mediaType }
  });

  await db.ticket.update({
    where: { id: ticketId },
    data: { status: sender === 'STAFF' ? 'PENDING' : 'OPEN' }
  });

  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath(`/admin/support/${ticketId}`);
}
