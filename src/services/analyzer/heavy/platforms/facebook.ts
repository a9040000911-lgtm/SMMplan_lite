/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const FacebookParser: PlatformParser = {
  name: 'FACEBOOK' as Platform,
  domains: ['facebook.com', 'fb.com', 'fb.me'],
  parse(url: string): AnalysisResult | null {
    const categories: Category[] = [];
    
    // 1. Reels & Videos (Priority because they can be inside pages)
    if (url.includes('/reel/') || url.includes('/watch') || url.includes('/video')) {
      return { 
        platform: 'FACEBOOK' as Platform, 
        possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], 
        objectType: 'FB_POST' 
      };
    }

    // 2. Posts (Various formats)
    const postPatterns = [
      /\/posts\//,
      /\/photos\//,
      /\/permalink\.php/,
      /\/photo\.php/,
      /\/story\.php/,
      /\/fbid=/
    ];
    if (postPatterns.some(p => p.test(url))) {
      return { 
        platform: 'FACEBOOK' as Platform, 
        possibleCategories: ['LIKES' as Category, 'VIEWS' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], 
        objectType: 'FB_POST' 
      };
    }

    // 3. Groups
    if (url.includes('/groups/')) {
      return { 
        platform: 'FACEBOOK' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category, 'OTHER' as Category], 
        objectType: 'FB_PROFILE' // Mapping group to generic CHANNEL/PROFILE
      };
    }

    // 4. Profiles / Pages (Default)
    // Check for profile.php?id=
    if (url.includes('profile.php?id=')) {
       return { platform: 'FACEBOOK' as Platform, possibleCategories: ['SUBSCRIBERS' as Category], objectType: 'FB_PROFILE' };
    }

    return { platform: 'FACEBOOK' as Platform, possibleCategories: ['SUBSCRIBERS' as Category], objectType: 'FB_PROFILE' };
  }
};
