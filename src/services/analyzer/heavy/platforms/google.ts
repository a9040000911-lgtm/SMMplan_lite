/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const GoogleParser: PlatformParser = {
  name: 'GOOGLE' as Platform,
  domains: ['google.com', 'google.ru', 'maps.google.com', 'business.google.com'],
  parse(url: string): AnalysisResult | null {
    // 1. Maps/Reviews
    if (url.includes('/maps/') || url.includes('google.com/maps')) {
      return { 
        platform: 'GOOGLE' as Platform, 
        possibleCategories: ['REVIEWS' as Category, 'RATINGS' as Category], 
        objectType: 'GOOGLE_MAPS' 
      };
    }

    // 2. Search Result/Ad Traffic
    if (url.includes('/search')) {
      return { 
        platform: 'GOOGLE' as Platform, 
        possibleCategories: ['TRAFFIC' as Category], 
        objectType: 'GOOGLE_SEARCH' 
      };
    }

    // 3. My Business / Reviews link
    if (url.includes('/biz/') || url.includes('/place/')) {
      return { 
        platform: 'GOOGLE' as Platform, 
        possibleCategories: ['REVIEWS' as Category], 
        objectType: 'GOOGLE_BUSINESS' 
      };
    }

    return { 
      platform: 'GOOGLE' as Platform, 
      possibleCategories: ['TRAFFIC' as Category, 'REVIEWS' as Category], 
      objectType: 'GOOGLE_SEARCH' 
    };
  }
};
