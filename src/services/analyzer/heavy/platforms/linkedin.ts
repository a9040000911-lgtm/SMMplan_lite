/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const LinkedinParser: PlatformParser = {
  name: 'LINKEDIN' as Platform,
  domains: ['linkedin.com'],
  parse(url: string): AnalysisResult | null {
    // 1. Posts & Updates (Activities)
    if (url.includes('/posts/') || url.includes('/feed/update/')) {
      return { 
        platform: 'LINKEDIN' as Platform, 
        possibleCategories: ['LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], 
        objectType: 'LI_POST' 
      };
    }

    // 2. Companies/Pages
    if (url.includes('/company/')) {
      return { 
        platform: 'LINKEDIN' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category], 
        objectType: 'LI_COMPANY' 
      };
    }

    // 3. Individual Profiles
    if (url.includes('/in/')) {
      return { 
        platform: 'LINKEDIN' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category], 
        objectType: 'LI_PROFILE' 
      };
    }

    return null;
  }
};
