/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const YandexParser: PlatformParser = {
  name: 'YANDEX' as Platform,
  domains: ['yandex.ru', 'ya.ru', 'yandex.com', 'zen.yandex.ru', 'maps.yandex.ru'],
  parse(url: string): AnalysisResult | null {
    // 1. Maps/Reviews
    if (url.includes('/maps/') || url.includes('/profile/')) {
      return { 
        platform: 'YANDEX' as Platform, 
        possibleCategories: ['REVIEWS' as Category, 'RATINGS' as Category], 
        objectType: 'YANDEX_MAPS' 
      };
    }

    // 2. Zen (legacy check, already handled by DzenParser usually but good to have)
    if (url.includes('zen.yandex.ru')) {
      return { 
        platform: 'DZEN' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category, 'VIEWS' as Category], 
        objectType: 'DZ_CHANNEL' 
      };
    }

    // 3. Search / Direct traffic
    if (url.includes('/search')) {
      return { 
        platform: 'YANDEX' as Platform, 
        possibleCategories: ['TRAFFIC' as Category], 
        objectType: 'YANDEX_SEARCH' 
      };
    }

    return { 
      platform: 'YANDEX' as Platform, 
      possibleCategories: ['TRAFFIC' as Category, 'REVIEWS' as Category], 
      objectType: 'YANDEX_SEARCH' 
    };
  }
};
