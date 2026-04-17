/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const ThreadsParser: PlatformParser = {
  name: 'THREADS' as Platform,
  domains: ['threads.net', 'threads.com'],
  parse(url: string): AnalysisResult | null {
    // 1. Posts (Thread per-level)
    if (url.includes('/post/')) {
      return { 
        platform: 'THREADS' as Platform, 
        possibleCategories: ['LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], 
        objectType: 'TH_POST' 
      };
    }

    // 2. Profiles (Usually @handle or /@handle)
    if (url.includes('/@')) {
       return { 
         platform: 'THREADS' as Platform, 
         possibleCategories: ['SUBSCRIBERS' as Category], 
         objectType: 'TH_PROFILE' 
       };
    }

    // Default fallback to profile if it contains at least one slash after domain
    const path = new URL(url).pathname;
    if (path.length > 2) {
       return { platform: 'THREADS' as Platform, possibleCategories: ['SUBSCRIBERS' as Category], objectType: 'TH_PROFILE' };
    }

    return null;
  }
};
