/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const LikeeParser: PlatformParser = {
    name: 'LIKEE' as Platform,
    domains: ['likee.video', 'likee.com'],
    parse(url: string): AnalysisResult | null {
        if (url.includes('/video/') || url.includes('/v/')) {
            return {
                platform: 'LIKEE' as Platform,
                possibleCategories: ['LIKES' as Category, 'VIEWS' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category],
                objectType: 'LKE_VIDEO'
            };
        }
        return {
            platform: 'LIKEE' as Platform,
            possibleCategories: ['SUBSCRIBERS' as Category],
            objectType: 'LKE_PROFILE'
        };
    }
};


