import { db } from '@/lib/db';
import { paginatedQuery, type PaginatedResult } from '@/lib/pagination';
import { auditAdmin } from '@/lib/admin-audit';
import { sendAdminAlert } from '@/lib/notifications';
import { providerService } from '@/services/providers/provider.service';

// ── Types ──

export type CatalogRow = {
  id: string;
  numericId: number;
  name: string;
  description: string | null;
  externalId: string | null;
  providerId: string | null;
  rate: number;       // provider cost per 1000 (USD)
  markup: number;     // multiplier (e.g. 3.0 = 300%)
  minQty: number;
  maxQty: number;
  isActive: boolean;
  isDripFeedEnabled: boolean;
  isRefillEnabled: boolean;
  category: { id: string; name: string };
  _count: { orders: number };
};

export type ProviderExternalService = {
  service: string;
  name: string;
  rate: string;
  min: string;
  max: string;
  category: string;
};

const ANOMALY_THRESHOLD = 0.20; // 20% price change triggers alert

// ── Service ──

export class AdminCatalogService {

  /**
   * Paginated service list with category, markup, and order count.
   */
  async listServices(params: {
    cursor?: string;
    search?: string;
    pageSize?: number;
  }): Promise<PaginatedResult<CatalogRow>> {
    const where: Record<string, unknown> = {};

    if (params.search?.trim()) {
      const q = params.search.trim();
      const numId = parseInt(q, 10);

      if (!isNaN(numId) && q === String(numId)) {
        where.numericId = numId;
      } else {
        where.name = { contains: q, mode: 'insensitive' };
      }
    }

    return paginatedQuery<CatalogRow>(db.service, {
      cursor: params.cursor,
      pageSize: params.pageSize || 50,
      where,
      orderBy: { numericId: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    });
  }

  /**
   * Update markup for a service. Recalculates selling price.
   */
  async updateMarkup(
    serviceId: string,
    newMarkup: number,
    admin: { id: string; email: string }
  ) {
    if (newMarkup < 1.0) throw new Error('Наценка не может быть меньше 1.0 (100%)');
    if (newMarkup > 50.0) throw new Error('Наценка не может быть больше 50.0 (5000%)');

    const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });
    const oldMarkup = service.markup;

    await db.service.update({
      where: { id: serviceId },
      data: { markup: newMarkup },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICE_MARKUP_CHANGE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { markup: oldMarkup },
      newValue: { markup: newMarkup },
    });

    return { name: service.name, oldMarkup, newMarkup };
  }

  /**
   * Toggle service active/inactive.
   */
  async toggleService(
    serviceId: string,
    isActive: boolean,
    admin: { id: string; email: string }
  ) {
    const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });

    await db.service.update({
      where: { id: serviceId },
      data: { isActive },
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: isActive ? 'SERVICE_ENABLE' : 'SERVICE_DISABLE',
      target: serviceId,
      targetType: 'SERVICE',
      oldValue: { isActive: service.isActive },
      newValue: { isActive },
    });
  }

  /**
   * Fetch available services from a provider for cherry-pick import.
   */
  async getProviderServices(): Promise<ProviderExternalService[]> {
    try {
      const provider = await providerService.getDefaultProvider();
      const services = await provider.getServices();
      return services as ProviderExternalService[];
    } catch {
      return [];
    }
  }

  /**
   * Import selected services from a provider into our catalog.
   * Cherry-pick: only imports the selected IDs.
   */
  async importServices(
    externalIds: string[],
    categoryId: string,
    defaultMarkup: number,
    admin: { id: string; email: string }
  ) {
    const providerServices = await this.getProviderServices();
    const toImport = providerServices.filter(s => externalIds.includes(s.service.toString()));

    if (toImport.length === 0) throw new Error('Не найдены услуги для импорта');

    let importedCount = 0;

    for (const ext of toImport) {
      // Skip if already exists
      const existing = await db.service.findFirst({
        where: { externalId: ext.service.toString() },
      });

      if (existing) continue;

      await db.service.create({
        data: {
          name: ext.name,
          externalId: ext.service.toString(),
          categoryId,
          rate: parseFloat(ext.rate),
          markup: defaultMarkup,
          minQty: parseInt(ext.min, 10) || 10,
          maxQty: parseInt(ext.max, 10) || 100000,
          isActive: true,
        },
      });

      importedCount++;
    }

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SERVICES_IMPORT',
      target: categoryId,
      targetType: 'SERVICE',
      newValue: { importedCount, externalIds },
    });

    return { importedCount, totalRequested: externalIds.length };
  }

  /**
   * Anomaly Detector: checks for large price changes after catalog sync.
   * Called after sync-catalog worker runs.
   */
  async detectAnomalies(
    oldRates: Map<string, number>,
    newRates: Map<string, number>
  ): Promise<string[]> {
    const anomalies: string[] = [];

    for (const [serviceId, oldRate] of oldRates) {
      const newRate = newRates.get(serviceId);
      if (newRate === undefined || oldRate === 0) continue;

      const change = Math.abs((newRate - oldRate) / oldRate);
      if (change >= ANOMALY_THRESHOLD) {
        const direction = newRate > oldRate ? '📈' : '📉';
        const msg = `${direction} Услуга ${serviceId}: $${oldRate} → $${newRate} (${(change * 100).toFixed(0)}%)`;
        anomalies.push(msg);
      }
    }

    if (anomalies.length > 0) {
      sendAdminAlert(
        `⚡ Price Anomaly Detected\n\n${anomalies.join('\n')}`,
        'WARNING'
      );
    }

    return anomalies;
  }

  /**
   * Catalog stats for the header.
   */
  async getCatalogStats() {
    const [totalServices, activeServices, categories] = await Promise.all([
      db.service.count(),
      db.service.count({ where: { isActive: true } }),
      db.category.count(),
    ]);

    return { totalServices, activeServices, categories };
  }
}

export const adminCatalogService = new AdminCatalogService();
