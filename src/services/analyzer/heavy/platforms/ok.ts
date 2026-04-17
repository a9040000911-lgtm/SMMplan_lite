/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const OkParser: PlatformParser = {
    name: 'OK' as Platform,
    domains: ['ok.ru', 'odnoklassniki.ru'],
    parse(url: string): AnalysisResult | null {
        const isPrivate = url.includes('?st.invite=');

        if (url.includes('/group/') || url.includes('/club')) {
            return { platform: 'OK' as Platform, possibleCategories: ['SUBSCRIBERS' as Category, 'GROUPS' as Category], objectType: 'OK_GROUP', isPrivate };
        }
        if (url.includes('/video/')) return { platform: 'OK' as Platform, possibleCategories: ['VIEWS' as Category, 'COMMENTS' as Category, 'REACTIONS' as Category], objectType: 'OK_VIDEO', isPrivate };
        if (url.includes('/photo/')) return { platform: 'OK' as Platform, possibleCategories: ['REACTIONS' as Category, 'COMMENTS' as Category], objectType: 'OK_PHOTO', isPrivate };
        if (url.includes('/topic/') || url.includes('/statuses/')) return { platform: 'OK' as Platform, possibleCategories: ['REACTIONS' as Category, 'COMMENTS' as Category, 'REPOSTS' as Category], objectType: 'OK_POST', isPrivate };

        return {
            platform: 'OK' as Platform,
            possibleCategories: ['SUBSCRIBERS' as Category, 'FRIENDS' as Category],
            objectType: 'OK_PROFILE',
            isPrivate
        };
    }
};


