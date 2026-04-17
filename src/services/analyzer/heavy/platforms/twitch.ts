/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const TwitchParser: PlatformParser = {
    name: 'TWITCH' as Platform,
    domains: ['twitch.tv'],
    parse(url: string): AnalysisResult | null {
        if (url.includes('/videos/')) return { platform: 'TWITCH' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'TW_VIDEO' };
        if (url.includes('/clip/')) return { platform: 'TWITCH' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'TW_CLIP' };

        return {
            platform: 'TWITCH' as Platform,
            possibleCategories: ['SUBSCRIBERS' as Category, 'VIEWS' as Category],
            objectType: 'TW_CHANNEL',
        };
    }
};


