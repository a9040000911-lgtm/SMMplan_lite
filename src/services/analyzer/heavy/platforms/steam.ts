/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const SteamParser: PlatformParser = {
  name: 'STEAM' as Platform,
  domains: ['steamcommunity.com', 'steampowered.com'],
  parse(url: string): AnalysisResult | null {
    // 1. Profiles
    if (url.includes('/id/') || url.includes('/profiles/')) {
      return { 
        platform: 'STEAM' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category, 'VIEWS' as Category], 
        objectType: 'STEAM_PROFILE' 
      };
    }

    // 2. Groups
    if (url.includes('/groups/')) {
      return { 
        platform: 'STEAM' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category], 
        objectType: 'STEAM_GROUP' 
      };
    }

    // 3. Workshop/Items/SharedFiles
    if (url.includes('/sharedfiles/') || url.includes('/workshop/')) {
      return { 
        platform: 'STEAM' as Platform, 
        possibleCategories: ['LIKES' as Category, 'FAVORITES' as Category, 'VIEWS' as Category], 
        objectType: 'STEAM_WORKSHOP' 
      };
    }

    // 4. Games/App
    if (url.includes('/app/')) {
      return { 
        platform: 'STEAM' as Platform, 
        possibleCategories: ['VIEWS' as Category, 'OTHER' as Category], 
        objectType: 'STEAM_APP' 
      };
    }

    return { 
      platform: 'STEAM' as Platform, 
      possibleCategories: ['OTHER' as Category], 
      objectType: 'STEAM_PROFILE' 
    };
  }
};
