/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const InstagramParser: PlatformParser = {
  name: 'INSTAGRAM' as Platform,
  domains: ['instagram.com'],
  parse(url: string): AnalysisResult | null {
    if (url.includes('/p/') || url.includes('/tv/')) {
      return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['LIKES' as Category, 'VIEWS' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], objectType: 'IG_POST' };
    }
    if (url.includes('/reel/')) return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['LIKES' as Category, 'VIEWS' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], objectType: 'IG_REEL' };
    if (url.includes('/stories/highlights/')) return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'IG_HIGHLIGHT' };
    if (url.includes('/stories/')) return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'IG_STORY' };
    if (url.includes('/guides/')) return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category], objectType: 'IG_GUIDE' };
    if (url.includes('/ar/')) return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'IG_EFFECT' };
    if (url.includes('/reels/audio/') || url.includes('/music/')) return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category], objectType: 'IG_AUDIO' };
    return { platform: 'INSTAGRAM' as Platform, possibleCategories: ['SUBSCRIBERS' as Category], objectType: 'IG_PROFILE' };
  }
};


