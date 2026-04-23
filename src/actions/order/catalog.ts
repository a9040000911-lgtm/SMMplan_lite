"use server";

import { db } from "@/lib/db";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";

export type PublicService = {
  id: string;
  categoryId: string;
  name: string;
  rate: number;
  minQty: number;
  markup: number;
  description: string | null;
  speed: string;
  badge: string;
};

export type PublicCategory = {
  id: string;
  name: string;
  platform: IntelligencePlatform | null;
  icon: string;
  services: PublicService[];
};

export async function getPublicCatalogAction() {
  try {
    const rawCategories = await db.category.findMany({
      include: {
        network: true,
        services: {
          where: { isActive: true },
          orderBy: { rate: 'asc' }
        }
      },
      orderBy: {
        sort: 'asc'
      }
    });

    const catalog: PublicCategory[] = rawCategories
      .filter(c => c.services.length > 0) // Only return categories that have active services
      .map(c => {
        let platformName = c.network?.name;
        // fallback matching if no network is linked directly
        if (!platformName) {
           const cName = c.name.toLowerCase();
           if (cName.includes('instagram')) platformName = 'INSTAGRAM';
           else if (cName.includes('telegram')) platformName = 'TELEGRAM';
           else if (cName.includes('youtube')) platformName = 'YOUTUBE';
           else if (cName.includes('vk') || cName.includes('вконтакте')) platformName = 'VK';
           else if (cName.includes('tiktok')) platformName = 'TIKTOK';
           else platformName = 'OTHER';
        }

        // Map platform string to enum
        let mappedPlatform: IntelligencePlatform | null = null;
        if (platformName === 'INSTAGRAM') mappedPlatform = IntelligencePlatform.INSTAGRAM;
        if (platformName === 'TELEGRAM') mappedPlatform = IntelligencePlatform.TELEGRAM;
        if (platformName === 'VK') mappedPlatform = IntelligencePlatform.VK;
        if (platformName === 'YOUTUBE') mappedPlatform = IntelligencePlatform.YOUTUBE;
        if (platformName === 'TIKTOK') mappedPlatform = IntelligencePlatform.TIKTOK;

        let icon = "/brands/web.svg";
        if (mappedPlatform === IntelligencePlatform.INSTAGRAM) icon = "/brands/instagram.svg";
        if (mappedPlatform === IntelligencePlatform.TELEGRAM) icon = "/brands/telegram.svg";
        if (mappedPlatform === IntelligencePlatform.VK) icon = "/brands/vk.svg";
        if (mappedPlatform === IntelligencePlatform.YOUTUBE) icon = "/brands/youtube.svg";
        if (mappedPlatform === IntelligencePlatform.TIKTOK) icon = "/brands/tiktok.svg";

        return {
          id: c.id,
          name: c.name,
          platform: mappedPlatform,
          icon,
          services: c.services.map(s => {
             // Mock some random visual badges based on price for the "Ozon" effect automatically
             let badge = "";
             if (s.name.toLowerCase().includes('гарант')) badge = "ГАРАНТИЯ";
             else if (s.rate < 0.1) badge = "ХИТ";
             else if (s.rate > 2.0) badge = "ПРЕМИУМ";

             return {
                id: s.id,
                categoryId: s.categoryId,
                name: s.name,
                description: s.description,
                rate: s.rate,
                minQty: s.minQty,
                markup: s.markup,
                speed: s.name.toLowerCase().includes('быстр') ? 'Сразу' : 'В течение часа',
                badge
             };
          })
        };
      });

    return { success: true, data: catalog };
  } catch (error: any) {
    console.error("Failed to fetch public catalog:", error);
    return { success: false, error: "Failed to load catalog" };
  }
}
