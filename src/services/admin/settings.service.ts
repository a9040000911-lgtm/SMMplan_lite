import { db } from '@/lib/db';

export class SettingsService {
  // ── User Management ──
  async listUsers() {
    return db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        createdAt: true,
        _count: { select: { orders: true, tickets: true } }
      }
    });
  }

  async updateUserRole(userId: string, role: string) {
    const validRoles = ['USER', 'SUPPORT', 'ADMIN'];
    if (!validRoles.includes(role)) throw new Error(`Invalid role: ${role}`);
    return db.user.update({
      where: { id: userId },
      data: { role }
    });
  }

  // ── Provider Management ──
  async listProviders() {
    return db.provider.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async upsertProvider(data: { id?: string; name: string; apiUrl: string; apiKey: string; isActive: boolean }) {
    if (data.id) {
      return db.provider.update({
        where: { id: data.id },
        data: { name: data.name, apiUrl: data.apiUrl, apiKey: data.apiKey, isActive: data.isActive }
      });
    }
    return db.provider.create({
      data: { name: data.name, apiUrl: data.apiUrl, apiKey: data.apiKey, isActive: data.isActive }
    });
  }

  async deleteProvider(id: string) {
    return db.provider.delete({ where: { id } });
  }

  // ── System Settings ──
  async getSystemSettings() {
    let settings = await db.systemSettings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await db.systemSettings.create({
        data: { id: 'global', taxRate: 6.0, opexMonthly: 0, maintenanceMode: false, siteName: 'Smmplan', siteDescription: '' }
      });
    }
    return settings;
  }

  async updateSystemSettings(data: {
    taxRate?: number;
    opexMonthly?: number;
    maintenanceMode?: boolean;
    siteName?: string;
    siteDescription?: string;
  }) {
    return db.systemSettings.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...data }
    });
  }
}

export const settingsService = new SettingsService();
