"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/rbac";
import { CryptoService } from "@/lib/crypto";
import { auditAdmin } from "@/lib/admin-audit";
import { providerService } from "@/services/providers/provider.service";
import { z } from "zod";

const providerSchema = z.object({
  name: z.string().min(1).max(255),
  apiUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string(),
  isActive: z.boolean().default(false),
  balanceCurrency: z.string().length(3, "Use 3-letter ISO code like USD").toUpperCase(),
  httpMethod: z.enum(["GET", "POST"]),
  requestType: z.enum(["JSON", "FORM", "QUERY"]),
  headers: z.record(z.string()).default({})
});

const idSchema = z.string().min(1);

export async function createProvider(rawData: {
  name: string;
  apiUrl: string;
  apiKey: string;
  isActive: boolean;
  balanceCurrency: string;
  httpMethod: string;
  requestType: string;
  headers: Record<string, string>;
}) {
  return requireAdmin(async (admin) => {
    const data = providerSchema.parse(rawData);

    // Encrypt the API key before saving!
    const encryptedKey = CryptoService.encrypt(data.apiKey);
    
    // Prepare metadata json
    const metadata = {
       httpMethod: data.httpMethod,
       requestType: data.requestType,
       headers: data.headers
    };

    const provider = await db.provider.create({
      data: {
        name: data.name,
        apiUrl: data.apiUrl,
        apiKey: encryptedKey,
        isActive: data.isActive,
        balanceCurrency: data.balanceCurrency,
        metadata: metadata,
      }
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROVIDER_CREATE",
      target: provider.id,
      targetType: "PROVIDER",
      newValue: { name: provider.name, apiUrl: provider.apiUrl }
    });

    return { success: true, error: undefined, providerId: provider.id };
  });
}

export async function updateProvider(rawId: string, rawData: {
  name: string;
  apiUrl: string;
  apiKey?: string; // If empty, we don't update
  isActive: boolean;
  balanceCurrency: string;
  httpMethod: string;
  requestType: string;
  headers: Record<string, string>;
}) {
  return requireAdmin(async (admin) => {
    const id = idSchema.parse(rawId);
    
    // Create an update schema dynamically to allow empty apikey
    const updateSchema = providerSchema.extend({
      apiKey: z.string().optional()
    });
    const data = updateSchema.parse(rawData);
    
    const updateData: any = {
      name: data.name,
      apiUrl: data.apiUrl,
      isActive: data.isActive,
      balanceCurrency: data.balanceCurrency,
      metadata: {
         httpMethod: data.httpMethod,
         requestType: data.requestType,
         headers: data.headers
      }
    };

    if (data.apiKey && data.apiKey.trim() !== "") {
       updateData.apiKey = CryptoService.encrypt(data.apiKey);
    }

    const provider = await db.provider.update({
      where: { id },
      data: updateData
    });

    auditAdmin({
      adminId: admin.id,
      adminEmail: admin.email,
      action: "PROVIDER_UPDATE",
      target: provider.id,
      targetType: "PROVIDER",
      newValue: { name: provider.name, isActive: provider.isActive }
    });

    return { success: true, error: undefined };
  });
}

export async function deleteProvider(rawId: string) {
    return requireAdmin(async (admin) => {
      const id = idSchema.parse(rawId);
      // Check if it has related services
      const count = await db.service.count({ where: { providerId: id } });
      if (count > 0) {
         return { success: false, error: `Cannot delete provider. It is used by ${count} services. Reassign them first.` };
      }

      await db.provider.delete({ where: { id } });

      auditAdmin({
          adminId: admin.id,
          adminEmail: admin.email,
          action: "PROVIDER_DELETE",
          target: id,
          targetType: "PROVIDER",
      });

      return { success: true, error: undefined };
    });
}

export async function checkProviderConnection(rawId: string) {
    return requireAdmin(async () => {
        try {
            const id = idSchema.parse(rawId);
            const providerRecord = await db.provider.findUnique({ where: { id } });
            if (!providerRecord) throw new Error("Provider not found");
            
            const instance = await providerService.getProviderInstance(providerRecord);
            const balanceData = await instance.getBalance();
            
            return { 
                success: true, 
                balance: balanceData.balance, 
                currency: balanceData.currency 
            };
        } catch (e: any) {
            return { success: false, error: e.message || "Connection failed" };
        }
    });
}
