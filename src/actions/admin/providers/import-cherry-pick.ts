"use server";

import { requireAdmin } from "@/lib/server/rbac";
import { adminCatalogService } from "@/services/admin/catalog.service";
import { providerService } from "@/services/providers/provider.service";
import { db } from "@/lib/db";

export async function fetchExternalServices(providerId?: string) {
  return requireAdmin(async () => {
     let providerInstance;
     if (providerId) {
        const p = await db.provider.findUnique({ where: { id: providerId } });
        if (!p) throw new Error("Provider not found");
        providerInstance = await providerService.getProviderInstance(p);
     } else {
        providerInstance = await providerService.getDefaultProvider();
     }

     const services = await providerInstance.getServices();
     
     // Also fetch existing externalIds to denote which ones are already imported
     const existing = await db.service.findMany({
         select: { externalId: true, id: true, name: true }
     });

     const existingMap = new Map(existing.map(s => [s.externalId, s]));

     return {
        success: true,
        services: services.map(s => ({
            ...s,
            alreadyImported: existingMap.has(String(s.service)),
            localServiceId: existingMap.get(String(s.service))?.id
        }))
     };
  });
}

export async function importSelectedServices(externalIds: string[], categoryId: string, defaultMarkup: number) {
    return requireAdmin(async (admin) => {
        try {
            const res = await adminCatalogService.importServices(externalIds, categoryId, defaultMarkup, admin);
            return { success: true, imported: res.importedCount };
        } catch (e: any) {
             return { success: false, error: e.message };
        }
    });
}
