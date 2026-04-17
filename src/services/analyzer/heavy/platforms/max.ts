/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const MaxParser: PlatformParser = {
    name: 'MAX' as Platform,
    domains: ['max.ru', 'max.app', 't.max.ru', 'max.im'],
    parse(url: string): AnalysisResult | null {
        const isPrivate = url.includes('/join/') || url.includes('?invite=');

        if (url.includes('/join/') || url.includes('?invite=')) {
            return { platform: 'MAX' as Platform, possibleCategories: ['SUBSCRIBERS' as Category, 'GROUPS' as Category], objectType: 'MAX_GROUP', isPrivate: true };
        }

        if (url.includes('start=')) return { platform: 'MAX' as Platform, possibleCategories: ['BOTS' as Category], objectType: 'MAX_BOT' };

        const urlParts = url.split('?')[0].split('/');
        const lastPart = urlParts[urlParts.length - 1];

        if (/^\d+$/.test(lastPart)) {
            return {
                platform: 'MAX' as Platform,
                possibleCategories: ['VIEWS' as Category, 'REACTIONS' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category],
                objectType: 'MAX_POST',
                isPrivate
            };
        }

        return {
            platform: 'MAX' as Platform,
            possibleCategories: ['SUBSCRIBERS' as Category, 'GROUPS' as Category, 'VIEWS' as Category, 'REACTIONS' as Category],
            objectType: 'MAX_CHANNEL',
            isPrivate
        };
    }
};


