/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const DzenParser: PlatformParser = {
  name: 'DZEN' as Platform,
  domains: ['dzen.ru'],
  parse(url: string): AnalysisResult | null {
    // 1. Articles
    if (url.includes('/a/')) {
      return { 
        platform: 'DZEN' as Platform, 
        possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category], 
        objectType: 'DZ_ARTICLE' 
      };
    }

    // 2. Videos / Watch
    if (url.includes('/video/watch/')) {
      return { 
        platform: 'DZEN' as Platform, 
        possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category], 
        objectType: 'DZ_VIDEO' 
      };
    }

    // 3. Channels (id, @name, or plain name)
    const path = new URL(url).pathname;
    if (path.length > 2) {
       return { 
         platform: 'DZEN' as Platform, 
         possibleCategories: ['SUBSCRIBERS' as Category], 
         objectType: 'DZ_CHANNEL' 
       };
    }

    return null;
  }
};
