/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const TiktokParser: PlatformParser = {
    name: 'TIKTOK' as Platform,
    domains: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
    parse(url: string): AnalysisResult | null {
        if (url.includes('/video/') || url.includes('/t/')) {
            return { platform: 'TIKTOK' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category, 'SAVES' as Category], objectType: 'TT_VIDEO' };
        }
        return { platform: 'TIKTOK' as Platform, possibleCategories: ['SUBSCRIBERS' as Category], objectType: 'TT_PROFILE' };
    }
};


