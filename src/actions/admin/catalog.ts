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
