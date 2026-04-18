'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { adminCatalogService } from '@/services/admin/catalog.service';
import { revalidatePath } from 'next/cache';

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
  const serviceId = formData.get('serviceId') as string;
  const markup = parseFloat(formData.get('markup') as string);

  if (!serviceId || isNaN(markup)) throw new Error('serviceId и markup обязательны');

  await adminCatalogService.updateMarkup(serviceId, markup, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/catalog');
}

export async function toggleServiceAction(formData: FormData) {
  const { user } = await requireManager();
  const serviceId = formData.get('serviceId') as string;
  const isActive = formData.get('isActive') === 'true';

  if (!serviceId) throw new Error('Missing serviceId');

  await adminCatalogService.toggleService(serviceId, isActive, {
    id: user.id,
    email: user.email,
  });

  revalidatePath('/admin/catalog');
}

export async function importServicesAction(formData: FormData) {
  const { user } = await requireManager();
  const externalIdsRaw = formData.get('externalIds') as string;
  const categoryId = formData.get('categoryId') as string;
  const markup = parseFloat(formData.get('markup') as string) || 3.0;

  if (!externalIdsRaw || !categoryId) {
    throw new Error('externalIds и categoryId обязательны');
  }

  const externalIds = externalIdsRaw.split(',').map(s => s.trim()).filter(Boolean);

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
  const categoryId = formData.get('categoryId') as string | null;
  const platform = formData.get('platform') as string | null;
  const markup = parseFloat(formData.get('markup') as string);

  if (isNaN(markup) || markup < 1.0 || markup > 151.0) {
    throw new Error('Наценка должна быть в диапазоне 1.0–151.0');
  }

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
