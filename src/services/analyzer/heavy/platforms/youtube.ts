/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { PlatformParser, AnalysisResult } from '../types';

export const YoutubeParser: PlatformParser = {
    name: 'YOUTUBE' as Platform,
    domains: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'm.youtube.com'],
    parse(url: string): AnalysisResult | null {
        if (url.includes('/shorts/')) {
            return { platform: 'YOUTUBE' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], objectType: 'YT_SHORT' };
        }
        if (url.includes('/live') || url.includes('/c/') || url.includes('/channel/') || url.includes('/user/') || url.includes('@')) {
            if (url.includes('/live')) return { platform: 'YOUTUBE' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'COMMENTS' as Category], objectType: 'YT_LIVE' };
            return { platform: 'YOUTUBE' as Platform, possibleCategories: ['SUBSCRIBERS' as Category, 'WATCH_TIME' as Category], objectType: 'YT_CHANNEL' };
        }
        if (url.includes('playlist')) {
            return { platform: 'YOUTUBE' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'YT_PLAYLIST' };
        }
        if (url.includes('watch') || url.includes('youtu.be')) {
            return { platform: 'YOUTUBE' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category, 'WATCH_TIME' as Category], objectType: 'YT_VIDEO' };
        }
        return { platform: 'YOUTUBE' as Platform, possibleCategories: ['SUBSCRIBERS' as Category], objectType: 'YT_CHANNEL' };
    }
};


