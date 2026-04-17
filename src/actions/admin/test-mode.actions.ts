"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/server/rbac";
import { SettingsManager } from "@/lib/settings";

/**
 * Toggles the global mock test mode.
 */
export async function adminToggleTestMode(enable: boolean) {
  return requireAdmin(async () => {
    await SettingsManager.setTestMode(enable);
    return { success: true, message: `Test mode is now ${enable ? 'ON' : 'OFF'}` };
  });
}

/**
 * Irreversibly deletes all data marked with the isTest flag.
 * This is the Nucleus Clear for the Mock Environment.
 */
export async function adminClearTestData() {
  return requireAdmin(async () => {
    try {
      // Deleting Orders cascading relationships
      const resultOrders = await db.order.deleteMany({
        where: { isTest: true }
      });
      
      return { 
        success: true, 
        message: `Cleared ${resultOrders.count} test orders and associated data.` 
      };
    } catch (e: any) {
      console.error("Failed to clear test data:", e);
      return { success: false, error: "Failed to perform Nucleus Clear." };
    }
  });
}
