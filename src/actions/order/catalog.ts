"use server";

import { db } from "@/lib/db";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { applyBeautifulRounding, USD_TO_RUB } from "@/lib/financial-constants";

export type PublicService = {
  id: string;
  categoryId: string;
  name: string;
  pricePer1kRub: number;
  minQty: number;
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
      where: {
        services: { some: { isActive: true } }
      },
      include: {
        network: true
      },
      orderBy: {
        sort: 'asc'
      }
    });

    const catalog: PublicCategory[] = rawCategories
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
          services: [] // Services are now loaded lazily via getServicesByCategoryAction
        };
      });

    return { success: true, data: catalog };
  } catch (error: any) {
    console.error("Failed to fetch public catalog:", error);
    return { success: false, error: "Failed to load catalog" };
  }
}

export async function getServicesByCategoryAction(categoryId: string): Promise<PublicService[]> {
  try {
    const services = await db.service.findMany({
      where: { categoryId, isActive: true },
      orderBy: { rate: 'asc' },
      take: 100
    });

    return services.map(s => {
       let badge = "";
       if (s.name.toLowerCase().includes('гарант')) badge = "ГАРАНТИЯ";
       else if (s.rate < 0.1) badge = "ХИТ";
       else if (s.rate > 2.0) badge = "ПРЕМИУМ";

       return {
          id: s.id,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          pricePer1kRub: applyBeautifulRounding(s.rate * s.markup * USD_TO_RUB),
          minQty: s.minQty,
          speed: s.name.toLowerCase().includes('быстр') ? 'Сразу' : 'В течение часа',
          badge
       };
    });
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  }
}
