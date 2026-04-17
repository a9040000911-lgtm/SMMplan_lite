/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const TrovoParser: PlatformParser = {
  name: 'TROVO' as Platform,
  domains: ['trovo.live'],
  parse(url: string): AnalysisResult | null {
    // 1. Channel/Profile (usually trovo.live/username)
    if (url.split('/').length >= 4) {
      return { 
        platform: 'TROVO' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category, 'VIEWS' as Category], 
        objectType: 'TROVO_CHANNEL' 
      };
    }

    return { 
      platform: 'TROVO' as Platform, 
      possibleCategories: ['SUBSCRIBERS' as Category, 'VIEWS' as Category], 
      objectType: 'TROVO_CHANNEL' 
    };
  }
};
