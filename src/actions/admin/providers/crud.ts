"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/rbac";
import { CryptoService } from "@/lib/crypto";
import { auditAdmin } from "@/lib/admin-audit";
import { providerService } from "@/services/providers/provider.service";

export async function createProvider(data: {
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

export async function updateProvider(id: string, data: {
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

export async function deleteProvider(id: string) {
    return requireAdmin(async (admin) => {
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

export async function checkProviderConnection(id: string) {
    return requireAdmin(async () => {
        try {
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
