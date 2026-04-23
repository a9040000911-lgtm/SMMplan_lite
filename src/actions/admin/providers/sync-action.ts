"use server";

import { db } from "@/lib/db";
import { providerService } from "@/services/providers/provider.service";
import { SmartAnalyzerLogic, CATEGORY_LABELS } from "@/services/providers/smart-analyzer.logic";
import { applyPricingLadder, USD_TO_RUB } from "@/lib/financial-constants";

import { requireAdmin } from "@/lib/server/rbac";
import { auditAdmin } from "@/lib/admin-audit";

export async function adminSyncProviderCatalog() {
  return requireAdmin(async () => {
    try {
      const provider = await providerService.getDefaultProvider();
      if (!provider) {
         return { success: false, error: "No primary provider found." };
      }

      const apiServices = await provider.getServices();
      
      let createdCats = 0;
      let newServices = 0;
      let updatedServices = 0;

      // Prefetch all categories to avoid N+1 DB locks
      // Prefetch all categories to avoid N+1 DB locks
      const existingCats = await db.category.findMany({ include: { network: true } });
      // Map Format -> "instagram__❤️ Лайки / Нравится": "cuid_xyz123"
      const catMap = new Map(existingCats.map(c => [`${c.network?.slug || 'unknown'}__${c.name}`, c.id]));

      // Pre-fetch all externalIds currently existing to avoid N+1 queries
      const existingServices = await db.service.findMany({ select: { id: true, externalId: true } });
      const serviceMap = new Map(existingServices.map(s => [s.externalId, s.id]));

      for (const apiService of apiServices) {
         // Fallback on simple service types to map. Avoid Custom Subscriptions for MVP import
         if (apiService.type !== 'Default') continue;

         // 1. Analyze topology
         // The Vexboost structure passes category info within 'category' String
         const analysis = SmartAnalyzerLogic.detectSync(apiService.name, '', apiService.category);
         
         const platform = analysis.platform; 
         const rawCatName = analysis.category; 
         const catName = CATEGORY_LABELS[rawCatName] || rawCatName; 

         // 2. Resolve Category Map
         const canonicalSlug = platform.toLowerCase() || 'unknown';
         const mapKey = `${canonicalSlug}__${catName}`;
         let categoryId = catMap.get(mapKey);

         if (!categoryId) {
             const network = await db.network.upsert({
                 where: { slug: canonicalSlug },
                 update: {},
                 create: { name: platform, slug: canonicalSlug, sort: 0 }
             });

             const newCat = await db.category.create({
                 data: {
                     networkId: network.id,
                     name: catName,
                     sort: 0
                 }
             });
             categoryId = newCat.id;
             catMap.set(mapKey, categoryId);
             createdCats++;
         }

         // 3. Upsert Service
         const externalId = String(apiService.service);
         const rateFloat = parseFloat(apiService.rate) || 0;
         const minInt = parseInt(apiService.min, 10) || 10;
         const maxInt = parseInt(apiService.max, 10) || 100000;

         const existingServiceId = serviceMap.get(externalId);

         if (existingServiceId) {
             // We update rate logic ONLY. We deliberately do NOT update Name or CategoryId
             // This ensures the Admin's manual edits (renaming, moving) are forever preserved.
             await db.service.update({
                 where: { id: existingServiceId },
                 data: {
                     rate: rateFloat,
                     minQty: minInt,
                     maxQty: maxInt,
                     isActive: true,
                     lastSeenAt: new Date()
                 }
             });
             updatedServices++;
         } else {
             // Calculate smart markup based on price tier
             const retailFromLadder = applyPricingLadder(rateFloat * USD_TO_RUB);
             const calculatedMarkup = rateFloat > 0 ? Math.round((retailFromLadder / (rateFloat * USD_TO_RUB)) * 100) / 100 : 3.0;

             // Insert new service since we didn't map it
             await db.service.create({
                 data: {
                     name: analysis.suggestedName || apiService.name,
                     categoryId: categoryId,
                     rate: rateFloat,
                     markup: calculatedMarkup,
                     minQty: minInt,
                     maxQty: maxInt,
                     externalId: externalId,
                     isActive: true,
                     isDripFeedEnabled: apiService.dripfeed ?? false,
                     isRefillEnabled: apiService.refill ?? false,
                     isCancelEnabled: apiService.cancel ?? false,
                     lastSeenAt: new Date()
                 }
             });
             newServices++;
         }
      }

      auditAdmin({
        adminId: 'system',
        adminEmail: 'system',
        action: 'CATALOG_SYNC',
        target: 'provider',
        targetType: 'SERVICE',
        newValue: { createdCats, newServices, updatedServices },
      });

      return { 
          success: true, 
          message: `Catalog Sync complete. Created ${createdCats} Categories, ${newServices} New Services, and updated ${updatedServices} rates.` 
      };

    } catch (err: any) {
      console.error("Critical Sync Error:", err);
      return { success: false, error: err.message };
    }
  });
}
