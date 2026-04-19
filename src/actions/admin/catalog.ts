'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateMarkupSchema = z.object({
  serviceId: z.string().min(1),
  markup: z.coerce.number()
});

const toggleServiceSchema = z.object({
  serviceId: z.string().min(1),
  isActive: z.any().transform(val => val === 'true' || val === 'on')
});

const importServicesSchema = z.object({
  externalIds: z.string().min(1),
  categoryId: z.string().min(1),
  markup: z.coerce.number().optional().default(3.0)
});

const bulkUpdateMarkupSchema = z.object({
  categoryId: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  markup: z.coerce.number().min(1.0).max(151.0)
});

async function requireManager() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !['OWNER', 'ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Forbidden: только Управляющие и выше');
  }
  return { session, user };
}

export async function updateMarkupAction(formData: FormData) {
  const { user } = await requireManager();
  const parsed = updateMarkupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('serviceId и markup обязательны');
  const { serviceId, markup } = parsed.data;

  await adminCatalogService.updateMarkup(serviceId, markup, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/catalog');
}

export async function toggleServiceAction(formData: FormData) {
  const { user } = await requireManager();
  const parsed = toggleServiceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error('Missing serviceId');
  const { serviceId, isActive } = parsed.data;

  await adminCatalogService.toggleService(serviceId, isActive, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/catalog');
}

export async function importServicesAction(formData: FormData) {
  const { user } = await requireManager();
  const parsed = importServicesSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error('externalIds и categoryId обязательны');
  }
  const { externalIds: externalIdsRaw, categoryId, markup } = parsed.data;

  const externalIds = externalIdsRaw.split(',').map((s: string) => s.trim()).filter(Boolean);

  await adminCatalogService.importServices(externalIds, categoryId, markup, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/catalog');
}

/**
 * Bulk update markup for all services in a category or platform.
 * Pass markup=0 to auto-calculate from Pricing Ladder.
 */
export async function bulkUpdateMarkupAction(formData: FormData) {
  const { user } = await requireManager();
  const parsed = bulkUpdateMarkupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    throw new Error('Наценка должна быть в диапазоне 1.0–151.0');
  }
  const { categoryId, platform, markup } = parsed.data;

  const filter: { categoryId?: string; platform?: string } = {};
  if (categoryId) filter.categoryId = categoryId;
  if (platform) filter.platform = platform;

  const result = await adminCatalogService.bulkUpdateMarkup(filter, markup, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/catalog');
  return result;
}

/**
 * Returns markup distribution analytics for the admin dashboard.
 */
export async function getMarkupAnalyticsAction() {
  await requireManager();
  return adminCatalogService.getMarkupAnalytics();
}
