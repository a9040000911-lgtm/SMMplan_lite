import { db } from "@/lib/db";
import { SystemSettings } from "@prisma/client";

/**
 * Controller to manage and fetch global System Settings (Singletons).
 */
export class SettingsManager {
  /**
   * Fetches the global settings. If they do not exist, creates the default singleton record.
   */
  static async get(): Promise<SystemSettings> {
    let settings = await db.systemSettings.findUnique({
      where: { id: "global" }
    });

    if (!settings) {
       settings = await db.systemSettings.create({
         data: {
           id: "global",
           taxRate: 6.0,
           opexMonthly: 0,
           maintenanceMode: false,
           isTestMode: false,
           siteName: "Smmplan",
           siteDescription: ""
         }
       });
    }

    return settings;
  }

  static async isTestMode(): Promise<boolean> {
     const settings = await this.get();
     return settings.isTestMode;
  }

  static async setTestMode(enabled: boolean): Promise<SystemSettings> {
     return await db.systemSettings.update({
        where: { id: "global" },
        data: { isTestMode: enabled }
     });
  }
}
