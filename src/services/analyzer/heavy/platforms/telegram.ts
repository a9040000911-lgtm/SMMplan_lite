/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const TelegramParser: PlatformParser = {
  name: 'TELEGRAM' as Platform,
  domains: ['t.me', 'telegram.me', 'telegram.dog'],
  parse(url: string): AnalysisResult | null {
    const isPrivate = url.includes('t.me/+') || url.includes('/joinchat/') || url.includes('t.me/c/') || url.includes('?invite=');

    if (url.includes('t.me/+') || url.includes('/joinchat/') || url.includes('?invite=')) {
      return { platform: 'TELEGRAM' as Platform, possibleCategories: ['SUBSCRIBERS' as Category, 'GROUPS' as Category], objectType: 'TG_INVITE', isPrivate: true };
    }

    const lowerUrl = url.toLowerCase();
    // A bot link can have start parameters, or the username ends with "bot", "bot/" or "?".
    if (lowerUrl.includes('start=') || lowerUrl.endsWith('bot') || lowerUrl.endsWith('bot/') || lowerUrl.includes('bot?') || lowerUrl.includes('/bot/')) {
      return { platform: 'TELEGRAM' as Platform, possibleCategories: ['BOTS' as Category, 'REFERRALS' as Category, 'OTHER' as Category], objectType: 'TG_BOT' };
    }

    if (url.includes('stars') || url.includes('/stars')) {
      return { platform: 'TELEGRAM' as Platform, possibleCategories: ['STARS' as Category], objectType: 'TG_STARS' };
    }

    // Stories check should come before generic channel/post because they contain /s/ or /stories/
    if (url.includes('/s/') || url.includes('/stories/')) {
      return {
        platform: 'TELEGRAM' as Platform,
        possibleCategories: ['STORIES' as Category],
        objectType: 'TG_STORY',
        isPrivate
      };
    }

    if (url.includes('/boost/') || url.includes('?boost') || url.includes('&boost') || url.includes('?c=')) return { platform: 'TELEGRAM' as Platform, possibleCategories: ['BOOSTS' as Category], objectType: 'TG_BOOST' };
    if (url.includes('/proxy')) return { platform: 'TELEGRAM' as Platform, possibleCategories: ['OTHER' as Category], objectType: 'TG_PROXY' };
    if (url.includes('/addlist/')) return { platform: 'TELEGRAM' as Platform, possibleCategories: ['OTHER' as Category], objectType: 'TG_FOLDER' };
    if (url.includes('/$')) return { platform: 'TELEGRAM' as Platform, possibleCategories: ['OTHER' as Category], objectType: 'TG_INVOICE' };

    const urlParts = url.split('?')[0].split('/');
    const lastPart = urlParts[urlParts.length - 1];

    if (/^\d+$/.test(lastPart)) {
      return {
        platform: 'TELEGRAM' as Platform,
        possibleCategories: ['VIEWS' as Category, 'REACTIONS' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category, 'STARS' as Category],
        objectType: 'TG_POST',
        isPrivate,
        isAlbum: url.includes('?single'),
        isComment: url.includes('?comment=')
      };
    }

    // Если нет слеша в имени (например t.me/username), это может быть профиль или канал.
    // Для SMM систем обычно t.me/username - это канал/группа. 
    // Но если мы хотим поддержать "Звезды" (подарки профилю), вынесем это в отдельный тип или добавим категорию.

    return {
      platform: 'TELEGRAM' as Platform,
      possibleCategories: ['SUBSCRIBERS' as Category, 'GROUPS' as Category, 'BOOSTS' as Category, 'VIEWS' as Category, 'REACTIONS' as Category, 'STARS' as Category],
      objectType: 'TG_CHANNEL', // Универсальный тип для t.me/name
      isPrivate
    };
  }
};


