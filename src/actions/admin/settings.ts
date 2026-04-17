'use server';

import { verifySession } from '@/lib/session';
import { db } from '@/lib/db';
import { settingsService } from '@/services/admin/settings.service';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await verifySession();
  if (!session) throw new Error('Unauthorized');
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.role !== 'ADMIN') throw new Error('Forbidden');
  return { session, user };
}

// ── User Role Update ──
export async function updateUserRole(formData: FormData) {
  const { session } = await requireAdmin();
  const targetUserId = formData.get('userId') as string;
  const newRole = formData.get('role') as string;

  if (!targetUserId || !newRole) return;
  if (targetUserId === session.userId) throw new Error('Cannot change own role');

  await settingsService.updateUserRole(targetUserId, newRole);
  await db.auditLog.create({
    data: {
      userId: session.userId,
      action: 'USER_ROLE_CHANGE',
      details: `Changed user ${targetUserId} role to ${newRole}`
    }
  });
  revalidatePath('/admin/settings');
}

// ── Provider Upsert ──
export async function upsertProvider(formData: FormData) {
  const { session } = await requireAdmin();
  const id = formData.get('id') as string || undefined;
  const name = formData.get('name') as string;
  const apiUrl = formData.get('apiUrl') as string;
  const apiKey = formData.get('apiKey') as string;
  const isActive = formData.get('isActive') === 'true';

  if (!name || !apiUrl || !apiKey) return;

  await settingsService.upsertProvider({ id, name, apiUrl, apiKey, isActive });
  await db.auditLog.create({
    data: {
      userId: session.userId,
      action: id ? 'PROVIDER_UPDATE' : 'PROVIDER_CREATE',
      details: `Provider: ${name} (${apiUrl})`
    }
  });
  revalidatePath('/admin/settings');
}

// ── System Settings Update ──
export async function updateGlobalSettings(formData: FormData) {
  const { session } = await requireAdmin();

  const maintenanceMode = formData.get('maintenanceMode') === 'true';
  const siteName = formData.get('siteName') as string || 'Smmplan';
  const siteDescription = formData.get('siteDescription') as string || '';

  await settingsService.updateSystemSettings({ maintenanceMode, siteName, siteDescription });
  await db.auditLog.create({
    data: {
      userId: session.userId,
      action: 'SYSTEM_SETTINGS_UPDATE',
      details: `Site: ${siteName}, Maintenance: ${maintenanceMode}`
    }
  });
  revalidatePath('/admin/settings');
}
