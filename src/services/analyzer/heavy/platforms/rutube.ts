/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const RutubeParser: PlatformParser = {
  name: 'RUTUBE' as Platform,
  domains: ['rutube.ru'],
  parse(url: string): AnalysisResult | null {
    // 1. Videos (Regular and Hash-based)
    if (url.includes('/video/')) {
      return { 
        platform: 'RUTUBE' as Platform, 
        possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category], 
        objectType: 'RT_VIDEO' 
      };
    }

    // 2. Shorts
    if (url.includes('/shorts/')) {
      return { 
        platform: 'RUTUBE' as Platform, 
        possibleCategories: ['VIEWS' as Category, 'LIKES' as Category], 
        objectType: 'RT_VIDEO' // Most SMM systems treat shorts as video
      };
    }

    // 3. Playlists
    if (url.includes('/plst/')) {
      return { 
        platform: 'RUTUBE' as Platform, 
        possibleCategories: ['VIEWS' as Category], 
        objectType: 'RT_VIDEO' // Or RT_PLAYLIST if added
      };
    }

    // 4. Channels
    if (url.includes('/channel/') || url.includes('/u/')) {
      return { 
        platform: 'RUTUBE' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category], 
        objectType: 'RT_CHANNEL' 
      };
    }

    return null;
  }
};
