'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminOrderService } from '@/services/admin/order.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { orderIdSchema } from '@/validators/admin.validators';

const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SUPPORT'];

async function requireStaff() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !STAFF_ROLES.includes(user.role)) throw new Error('Forbidden');
  return { session, user };
}

export async function cancelOrderAction(formData: FormData) {
  const { user } = await requireStaff();
  const parsed = orderIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing orderId');
  const { orderId } = parsed.data;

  await adminOrderService.cancelOrder(orderId, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/orders');
}

export async function restartOrderAction(formData: FormData) {
  const { user } = await requireStaff();
  const parsed = orderIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing orderId');
  const { orderId } = parsed.data;

  await adminOrderService.restartOrder(orderId, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/orders');
}
