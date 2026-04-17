/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const TwitterParser: PlatformParser = {
    name: 'TWITTER' as Platform,
    domains: ['x.com', 'twitter.com'],
    parse(url: string): AnalysisResult | null {
        if (url.includes('/status/') || url.includes('/statuses/')) {
            return {
                platform: 'TWITTER' as Platform,
                possibleCategories: ['LIKES' as Category, 'REPOSTS' as Category, 'VIEWS' as Category, 'COMMENTS' as Category],
                objectType: 'X_POST'
            };
        }
        return {
            platform: 'TWITTER' as Platform,
            possibleCategories: ['SUBSCRIBERS' as Category],
            objectType: 'X_PROFILE'
        };
    }
};


