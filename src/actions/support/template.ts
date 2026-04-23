'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const templateSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Название обязательно'),
  text: z.string().min(1, 'Текст обязателен'),
  sort: z.number().int().default(0)
});

export async function getTemplates() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  return db.supportTemplate.findMany({
    orderBy: { sort: 'asc' }
  });
}

export async function upsertTemplate(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const parsed = templateSchema.safeParse({
    id: formData.get('id') || undefined,
    label: formData.get('label'),
    text: formData.get('text'),
    sort: parseInt(formData.get('sort') as string || '0', 10)
  });

  if (!parsed.success) {
    throw new Error('Invalid input');
  }

  const data = parsed.data;

  if (data.id) {
    await db.supportTemplate.update({
      where: { id: data.id },
      data: { label: data.label, text: data.text, sort: data.sort }
    });
  } else {
    await db.supportTemplate.create({
      data: { label: data.label, text: data.text, sort: data.sort }
    });
  }

  revalidatePath('/admin/tickets');
  revalidatePath('/admin/tickets/[id]', 'page');
}

export async function deleteTemplate(formData: FormData) {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['ADMIN', 'SUPPORT', 'OWNER'].includes(user.role)) throw new Error('Forbidden');

  const id = formData.get('id') as string;
  if (!id) throw new Error('No id provided');

  await db.supportTemplate.delete({
    where: { id }
  });

  revalidatePath('/admin/tickets');
  revalidatePath('/admin/tickets/[id]', 'page');
}
