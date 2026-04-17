/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const MusicParser: PlatformParser = {
    name: 'MUSIC' as Platform,
    domains: ['music.yandex.ru', 'music.yandex.com'],
    parse(url: string): AnalysisResult | null {
        if (url.includes('/album/') && url.includes('/track/')) {
            return { platform: 'MUSIC' as Platform, possibleCategories: ['PLAYS' as Category, 'REACTIONS' as Category], objectType: 'YM_TRACK' as any };
        }
        if (url.includes('/album/')) {
            return { platform: 'MUSIC' as Platform, possibleCategories: ['PLAYS' as Category], objectType: 'YM_ALBUM' as any };
        }
        if (url.includes('/artist/')) {
            return { platform: 'MUSIC' as Platform, possibleCategories: ['SUBSCRIBERS' as Category, 'PLAYS' as Category], objectType: 'YM_ARTIST' as any };
        }
        if (url.includes('/users/') && url.includes('/playlists/')) {
            return { platform: 'MUSIC' as Platform, possibleCategories: ['PLAYS' as Category, 'REACTIONS' as Category], objectType: 'YM_PLAYLIST' as any };
        }

        return {
            platform: 'MUSIC' as Platform,
            possibleCategories: ['OTHER' as Category],
            objectType: 'UNKNOWN',
        };
    }
};


