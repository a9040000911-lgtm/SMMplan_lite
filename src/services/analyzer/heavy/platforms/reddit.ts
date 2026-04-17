/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const RedditParser: PlatformParser = {
  name: 'REDDIT' as Platform,
  domains: ['reddit.com'],
  parse(url: string): AnalysisResult | null {
    // 1. Comments/Posts
    if (url.includes('/comments/')) {
      return { 
        platform: 'REDDIT' as Platform, 
        possibleCategories: ['LIKES' as Category, 'COMMENTS' as Category, 'REPOSTS' as Category], 
        objectType: 'RD_POST' 
      };
    }

    // 2. Subreddits
    if (url.includes('/r/')) {
      return { 
        platform: 'REDDIT' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category], 
        objectType: 'RD_SUBREDDIT' 
      };
    }

    // 3. User Profiles
    if (url.includes('/user/') || url.includes('/u/')) {
      return { 
        platform: 'REDDIT' as Platform, 
        possibleCategories: ['SUBSCRIBERS' as Category], 
        objectType: 'RD_USER' 
      };
    }

    return null;
  }
};
