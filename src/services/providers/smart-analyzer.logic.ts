/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
export type Platform = string;
export type Category = string;
import { DescriptionSanitizer } from '@/utils/description-sanitizer';

export interface AnalyzedService {
    platform: Platform;
    platformSlug: string;
    category: Category;
    targetType: string;
    isPrivate: boolean;
    description_ru: string;
    suggestedName?: string;
    requirements?: string;
    geo?: string;
    warranty?: number;
}

export const PLATFORMS = ['TELEGRAM', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'VK', 'TWITCH', 'DISCORD', 'TWITTER', 'FACEBOOK', 'THREADS', 'REDDIT', 'RUTUBE', 'DZEN', 'MUSIC', 'OK', 'KICK', 'LIKEE', 'WHATSAPP', 'SPOTIFY', 'SOUNDCLOUD', 'LINKEDIN', 'PINTEREST', 'SNAPCHAT', 'TROVO', 'KWAI', 'MAX', 'GOOGLE', 'APPLE', 'YANDEX', 'STEAM', 'RUMBLE', 'TUMBLR', 'VIMEO', 'SHAZAM', 'QUORA', 'MEDIUM', 'WEBSITE', 'PERISCOPE', 'CLOUDHUB', 'AUDIOMACK', 'DATPIFF', 'OTHER'];
export const CATEGORIES = ['SUBSCRIBERS', 'GROUPS', 'LIKES', 'VIEWS', 'COMMENTS', 'REACTIONS', 'REPOSTS', 'BOOSTS', 'POLLS', 'STORIES', 'BOTS', 'REFERRALS', 'FRIENDS', 'PLAYS', 'TRAFFIC', 'DISLIKES', 'STARS', 'WATCH_TIME', 'SAVES', 'COMPLAINTS', 'OTHER'];
export const TARGET_TYPES = ['CHANNEL', 'POST', 'PROFILE', 'VIDEO', 'VK_VIDEO', 'VK_CLIP', 'VK_PLAY', 'CHANNEL_POSTS', 'STORY', 'COMMENTS', 'POLL', 'PHOTO', 'MARKET', 'PLAYLIST', 'ALBUM', 'EXTERNAL', 'CUSTOM'];

export const PLATFORM_LABELS: Record<string, string> = {
    TELEGRAM: 'Telegram',
    INSTAGRAM: 'Instagram',
    TIKTOK: 'TikTok',
    YOUTUBE: 'YouTube',
    VK: 'ВКонтакте',
    TWITCH: 'Twitch',
    DISCORD: 'Discord',
    TWITTER: 'Twitter (X)',
    FACEBOOK: 'Facebook',
    THREADS: 'Threads',
    REDDIT: 'Reddit',
    RUTUBE: 'Rutube',
    DZEN: 'Дзен',
    MUSIC: 'Музыка (Spotify/Apple)',
    OK: 'Одноклассники',
    KICK: 'Kick',
    LIKEE: 'Likee',
    WHATSAPP: 'WhatsApp',
    SPOTIFY: 'Spotify',
    SOUNDCLOUD: 'SoundCloud',
    LINKEDIN: 'LinkedIn',
    PINTEREST: 'Pinterest',
    SNAPCHAT: 'Snapchat',
    TROVO: 'Trovo',
    KWAI: 'Kwai',
    MAX: 'Max Messenger',
    GOOGLE: 'Google',
    APPLE: 'Apple Music/Podcast',
    YANDEX: 'Яндекс (Дзен/Maps/Music)',
    STEAM: 'Steam',
    RUMBLE: 'Rumble',
    TUMBLR: 'Tumblr',
    VIMEO: 'Vimeo',
    SHAZAM: 'Shazam',
    QUORA: 'Quora',
    MEDIUM: 'Medium',
    WEBSITE: 'Website Traffic',
    PERISCOPE: 'Periscope',
    CLOUDHUB: 'CloudHub',
    AUDIOMACK: 'Audiomack',
    DATPIFF: 'DatPiff',
    OTHER: 'Другое',
};

export const CATEGORY_LABELS: Record<string, string> = {
    SUBSCRIBERS: '👨‍👩‍👧‍👦 Подписчики / Участники',
    GROUPS: '👥 Вступление в группы / чаты',
    LIKES: '❤️ Лайки / Нравится',
    VIEWS: '👁 Просмотры / Охват',
    COMMENTS: '💬 Комментарии / Отзывы',
    REACTIONS: '🎭 Реакции / Эмодзи',
    REPOSTS: '📢 Репосты / Поделиться',
    BOOSTS: '🚀 Бусты (Telegram Levels)',
    POLLS: '📊 Голоса / Опросы',
    STORIES: '📱 Сториз / Истории',
    BOTS: '🤖 Роботы / Боты',
    REFERRALS: '🔗 Рефералы (Apps/Bots)',
    FRIENDS: '🤝 Заявки в друзья',
    PLAYS: '🎵 Прослушивания (Music)',
    TRAFFIC: '🌐 Трафик / Посещения',
    DISLIKES: '👎 Дизлайки',
    STARS: '⭐ Звезды (Telegram Stars)',
    WATCH_TIME: '⏳ Часы просмотра (YouTube)',
    SAVES: '📌 Сохранения / Saves',
    COMPLAINTS: '🚫 Жалобы / Reports',
    OTHER: '📦 Другое / Разное',
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
    CHANNEL: 'Канал/Группа',
    POST: 'Пост/Публикация',
    PROFILE: 'Профиль/Аккаунт',
    VIDEO: 'Видео/Reels',
    VK_VIDEO: 'VK Видео',
    VK_CLIP: 'VK Клип',
    VK_PLAY: 'VK Play Стрим',
    CHANNEL_POSTS: 'Посты канала (Авто)',
    STORY: 'Сторис',
    COMMENTS: 'Комментарии',
    POLL: 'Опрос',
    PHOTO: 'Фото',
    MARKET: 'Товар/Маркет',
    PLAYLIST: 'Плейлист',
    ALBUM: 'Альбом',
    EXTERNAL: 'Внешняя ссылка',
    CUSTOM: 'Свой тип (API)',
};

export const PLATFORM_KEYWORDS: Record<string, string[]> = {
    TELEGRAM: ['telegram', 'tg', 'телеграм', 'тг', 'запуск бота', 'рефералы'],
    INSTAGRAM: ['instagram', 'inst', 'инстаграм', 'инста'],
    VK: ['vk', 'вк', 'vkontakte', 'вконтакте'],
    YOUTUBE: ['youtube', 'yt', 'ютуб'],
    TIKTOK: ['tiktok', 'тикток', 'тт'],
    FACEBOOK: ['facebook', 'фейсбук'],
    TWITTER: ['twitter', 'x.com', 'твиттер'],
    DISCORD: ['discord', 'дискорд'],
    THREADS: ['threads'],
    REDDIT: ['reddit'],
    TWITCH: ['twitch', 'твич'],
    KICK: ['kick'],
    RUTUBE: ['rutube', 'рутуб'],
    DZEN: ['dzen', 'дзен'],
    MUSIC: ['music', 'музыка'],
    OK: ['ok', 'одноклассники', 'ок'],
    LIKEE: ['likee'],
    WHATSAPP: ['whatsapp', 'ватсап'],
    SPOTIFY: ['spotify', 'спотифай'],
    SOUNDCLOUD: ['soundcloud'],
    LINKEDIN: ['linkedin'],
    PINTEREST: ['pinterest'],
    SNAPCHAT: ['snapchat'],
    TROVO: ['trovo'],
    KWAI: ['kwai'],
    MAX: ['messenger', 'max', 'макс'],
    GOOGLE: ['google', 'гугл', 'gmap', 'review', 'отзыв'],
    APPLE: ['apple', 'podcast', 'itunes'],
    YANDEX: ['yandex', 'яндекс', 'ya.ru'],
    STEAM: ['steam', 'стим'],
    RUMBLE: ['rumble'],
    TUMBLR: ['tumblr'],
    VIMEO: ['vimeo'],
    SHAZAM: ['shazam'],
    QUORA: ['quora'],
    MEDIUM: ['medium'],
    WEBSITE: ['website', 'traffic', 'трафик', 'site', 'сайт'],
    PERISCOPE: ['periscope'],
    CLOUDHUB: ['cloudhub'],
    AUDIOMACK: ['audiomack'],
    DATPIFF: ['datpiff'],
    OTHER: []
};

export const CATEGORY_MAP: Record<string, string[]> = {
    SUBSCRIBERS: ['subscriber', 'member', 'follow', 'participant', 'reader', 'подписчики', 'подписчик', 'участники', 'участник', 'фолловер'],
    VIEWS: ['view', 'eye', 'watch', 'stream', 'просмотр', 'гляделок', 'глаз', 'посещен', 'охват', 'стат', 'visit', 'reach', 'stat', 'impressions'],
    BOTS: ['bot', 'бот'],
    LIKES: ['like', 'fav', 'heart', 'лайк', 'сердечк', 'классы', 'мне нравится', 'сохр', 'save'],
    COMMENTS: ['comment', 'review', 'коммент', 'отзыв'],
    REACTIONS: ['reaction', 'emoji', 'реакци', 'эмодзи'],
    REPOSTS: ['repost', 'share', 'репост', 'поделиться'],
    POLLS: ['poll', 'vote', 'опрос', 'голос', 'викторин'],
    STORIES: ['story', 'stories', 'сторис', 'истори'],
    BOOSTS: ['boost', 'буст', 'level', 'уровень'],
    REFERRALS: ['referral', 'реферал'],
    FRIENDS: ['friend', 'друг', 'друзья'],
    RECOVER: ['recover', 'восстанов', 'refill', 'докрут'],
    TRAFFIC: ['traffic', 'website', 'трафик'],
    DISLIKES: ['dislike', 'дизлайк'],
    GROUPS: ['group', 'chat', 'channel', 'чат', 'группа', 'канал', 'сообщест', 'паблик'],
    PLAYS: ['play', 'слуш', 'прослуш'],
    STARS: ['star', 'звезд'],
    WATCH_TIME: ['hour', 'watch time', 'время просмотр', 'часы просмотр'],
    SAVES: ['save', 'сохран', 'bookmark'],
    PREMIUM: ['premium', 'премиум'],
    STREAMS: ['viewer', 'stream', 'зрител', 'стрим', 'online', 'онлайн'],
    COMPLAINTS: ['жалоба', 'report', 'complaint', 'claim', 'насилие', 'спам', 'порнография', 'авторское право', 'фейк'],
    OTHER: []
};

export const GEO_MAP: Record<string, string[]> = {
    'RU': ['россия', 'рф', 'ru', '🇷🇺', 'русские'],
    'USA': ['сша', 'usa', '🇺🇸', 'english', 'worldwide'],
    'KZ': ['казахстан', 'кз', 'kz', '🇰🇿'],
    'UZ': ['узбекистан', 'uz', '🇺🇿'],
    'UA': ['украина', 'ua', '🇺🇦'],
    'TR': ['турция', 'tr', '🇹🇷', 'turkey'],
    'IN': ['индия', 'in', '🇮🇳', 'india'],
    'BR': ['бразилия', 'br', '🇧🇷'],
    'IL': ['израиль', 'il', '🇮🇱'],
    'AR': ['араб', 'arabic', '🇦🇪'],
    'CN': ['китай', 'china', '🇨🇳'],
};

export const SmartAnalyzerLogic = class {
    static detectSync(name: string, description: string = '', categoryInput: string = '', dynamicPlatforms?: Array<{ slug: string, keywords: string[], name: string }>): AnalyzedService {
        const sanitizedDescription = DescriptionSanitizer.sanitize(description);
        const nameNode = name.toLowerCase();
        const safeCategoryInput = String(categoryInput || '');
        const catInputLower = safeCategoryInput.toLowerCase();
        const fullContent = (name + ' ' + sanitizedDescription + ' ' + safeCategoryInput).toLowerCase();

        // 0. Detect Geo & Warranty
        let geo = 'WORLDWIDE';
        for (const [code, keywords] of Object.entries(GEO_MAP)) {
            if (keywords.some(k => fullContent.includes(k))) {
                geo = code;
                break;
            }
        }

        let warranty = 0;
        const warrantyMatch = name.match(/(\d+)\s*(?:дней|дня|день|day|d)/i);
        if (warrantyMatch) {
            warranty = parseInt(warrantyMatch[1]);
        } else if (fullContent.includes('♻️') || fullContent.includes('гарант')) {
            warranty = 30; // Default warranty if icon present
        }

        // 1. Detect Platform
        let platformEnum: Platform = 'OTHER';
        let platformSlug: string = 'other';

        // Weight-based platform detection
        const platformScores: Record<string, number> = {};
        for (const [p, keywords] of Object.entries(PLATFORM_KEYWORDS)) {
            platformScores[p] = 0;
            for (const k of keywords) {
                const isShort = k.length <= 2;
                const match = (text: string, key: string) => {
                    if (isShort) {
                        const rex = new RegExp(`\\b${key}\\b`, 'i');
                        return rex.test(text);
                    }
                    return text.includes(key);
                };

                if (match(catInputLower, k)) platformScores[p] += 10;
                if (match(nameNode, k)) platformScores[p] += 5;
                if (match(sanitizedDescription.toLowerCase(), k)) platformScores[p] += 1;
            }
        }

        let bestPlatformCode = 'OTHER';
        let maxPlatformScore = 0;
        for (const [p, score] of Object.entries(platformScores)) {
            if (score > maxPlatformScore) {
                maxPlatformScore = score;
                bestPlatformCode = p;
            }
        }

        if (bestPlatformCode !== 'OTHER') {
            platformEnum = bestPlatformCode as Platform;
            platformSlug = bestPlatformCode.toLowerCase();
        }

        // Override with dynamic if match found
        if (dynamicPlatforms && dynamicPlatforms.length > 0) {
            for (const p of dynamicPlatforms) {
                if (p.keywords.some(k => fullContent.includes(k.toLowerCase()))) {
                    platformSlug = p.slug.toLowerCase();
                    const upperSlug = p.slug.toUpperCase();
                    if (Object.keys(PLATFORM_KEYWORDS).includes(upperSlug)) {
                        platformEnum = upperSlug as Platform;
                    }
                    break;
                }
            }
        }

        // 2. Detect Category
        let category: Category = 'OTHER';

        // Context-aware logic for "Subscription" (Подписка)
        const isAutoMention = fullContent.includes('подписк') || fullContent.includes('auto') || fullContent.includes('subscription') || fullContent.includes('будущ');
        const isViewMention = fullContent.includes('просмотр') || fullContent.includes('view') || fullContent.includes('eye');
        const isLikeMention = fullContent.includes('лайк') || fullContent.includes('like') || fullContent.includes('heart');
        const isPostModifier = fullContent.includes('пост') || fullContent.includes('запис') || fullContent.includes('публикац');

        if (isAutoMention && (isViewMention || isLikeMention) && isPostModifier) {
             category = isViewMention ? 'VIEWS' : 'LIKES';
        } else if ((nameNode.includes('бот') || nameNode.includes(' bot')) && !nameNode.includes('подпис') && !nameNode.includes('участник')) {
            category = 'BOTS';
        } else {
            let bestCatMatch: { category: Category, index: number } | null = null;
            for (const [c, keywords] of Object.entries(CATEGORY_MAP)) {
                for (const k of keywords) {
                    const idx = fullContent.indexOf(k);
                    if (idx !== -1) {
                        if (!bestCatMatch || idx < bestCatMatch.index) {
                            bestCatMatch = { category: c as Category, index: idx };
                        }
                    }
                }
            }
            if (bestCatMatch) category = bestCatMatch.category;
        }

        const effectivePlatform = platformEnum; 

        // Specific refinements
        if (effectivePlatform === 'VK') {
            if (fullContent.includes('в друзья') || fullContent.includes('на профиль')) category = 'FRIENDS';
            else if (fullContent.includes('групп') || fullContent.includes('сообщест')) category = 'GROUPS';
            else if (fullContent.includes('прослуш') || fullContent.includes('плейлист')) category = 'PLAYS';
            else if (fullContent.includes('глазик') || fullContent.includes('на запись')) category = 'VIEWS';
            else if (fullContent.includes('опрос') || fullContent.includes('голос')) category = 'POLLS';
        } else if (effectivePlatform === 'FACEBOOK') {
            if (fullContent.includes('group') || fullContent.includes('групп')) category = 'SUBSCRIBERS';
            else if (fullContent.includes('reel') || fullContent.includes('video')) category = 'VIEWS';
        } else if (effectivePlatform === 'TELEGRAM') {
            const isStory = nameNode.includes('истори') || nameNode.includes('story');
            const isAutoViews = (nameNode.includes('подписк') || nameNode.includes('auto')) && (nameNode.includes('просмотр') || nameNode.includes('view'));
            
            if (fullContent.includes('stars')) category = 'STARS';
            else if (fullContent.includes('жалоба') || fullContent.includes('report')) category = 'COMPLAINTS';
            else if (fullContent.includes('boost') || fullContent.includes('буст')) category = 'BOOSTS';
            else if (isStory) category = 'STORIES';
            else if (isAutoViews) category = 'VIEWS';
            else if (nameNode.includes('подпис') || nameNode.includes('member')) {
                // ПРИОРИТЕТ: "Подписчики" (Subscribers) > "Подписка" (Boosts/Auto)
                category = 'SUBSCRIBERS';
            }
            else if (nameNode.includes('реакци') || nameNode.includes('reaction')) {
                // Earliest match check within name for views vs reactions
                const vIdx = nameNode.indexOf('просмотр');
                const vIdx2 = nameNode.indexOf('view');
                const rIdx = nameNode.indexOf('реакци');
                const rIdx2 = nameNode.indexOf('reaction');
                
                const minV = Math.min(vIdx === -1 ? Infinity : vIdx, vIdx2 === -1 ? Infinity : vIdx2);
                const minR = Math.min(rIdx === -1 ? Infinity : rIdx, rIdx2 === -1 ? Infinity : rIdx2);
                
                if (minV < minR) category = 'VIEWS';
                else category = 'REACTIONS';
            }
            else if (nameNode.includes('просмотр') || nameNode.includes('view')) category = 'VIEWS';
        } else if (effectivePlatform === 'YOUTUBE') {
            if (fullContent.includes('час') || fullContent.includes('hour')) category = 'WATCH_TIME';
            if (fullContent.includes('short')) category = 'VIEWS';
            if (nameNode.includes('лайк') || nameNode.includes('like')) category = 'LIKES';
        } else if (effectivePlatform === 'DZEN') {
            if (fullContent.includes('стать') || fullContent.includes('article')) category = 'VIEWS';
        } else if (effectivePlatform === 'INSTAGRAM') {
            if (nameNode.includes('story') || nameNode.includes('сторис')) category = 'STORIES';
            else if (nameNode.includes('подпис') || nameNode.includes('follow')) category = 'SUBSCRIBERS';
            else if (nameNode.includes('лайк') || nameNode.includes('like')) category = 'LIKES';
            else if (nameNode.includes(' reels') || nameNode.includes('просмотр')) category = 'VIEWS';
        }

        // 3. Target Type
        let targetType = 'POST';
        const isPrivate = fullContent.includes('private') || fullContent.includes('закрыт') || fullContent.includes('приват');
        const isAuto = isAutoMention || fullContent.includes('последних');

        if (effectivePlatform === 'TELEGRAM') {
            if (category === 'STARS') targetType = 'CUSTOM';
            else if (category === 'BOTS' || category === 'REFERRALS') targetType = 'CHANNEL';
            else if (category === 'STORIES') targetType = 'STORY';
            else if (isAuto) targetType = 'CHANNEL_POSTS';
            else if (['SUBSCRIBERS', 'GROUPS', 'BOOSTS'].includes(category)) targetType = 'CHANNEL';
            else targetType = 'POST';
        } else if (effectivePlatform === 'YOUTUBE') {
            if (category === 'SUBSCRIBERS') targetType = 'CHANNEL';
            else targetType = 'POST'; // Changed from 'VIDEO' to 'POST'
        } else if (effectivePlatform === 'INSTAGRAM') {
            if (isAuto) targetType = 'CHANNEL_POSTS';
            else if (category === 'SUBSCRIBERS') targetType = 'CHANNEL'; // Changed from 'PROFILE' to 'CHANNEL'
            else if (category === 'STORIES') targetType = 'STORY';
            else if (fullContent.includes('reel') || fullContent.includes('video')) targetType = 'POST'; // Changed from 'VIDEO' to 'POST'
            else targetType = 'POST';
        } else if (effectivePlatform === 'VK') {
            if (isAuto) targetType = 'CHANNEL_POSTS';
            else if (fullContent.includes('stream') || fullContent.includes('зрител')) targetType = 'POST'; // Changed from 'VIDEO' to 'POST'
            else if (category === 'POLLS') targetType = 'POLL';
            else if (category === 'FRIENDS') targetType = 'CHANNEL'; // Changed from 'PROFILE' to 'CHANNEL'
            else if (category === 'GROUPS' || category === 'SUBSCRIBERS') targetType = 'CHANNEL';
            else if (fullContent.includes('clip') || fullContent.includes('клип')) targetType = 'POST'; // Changed from 'VK_CLIP' to 'POST'
            else if (fullContent.includes('video') || fullContent.includes('видео')) targetType = 'POST'; // Changed from 'VK_VIDEO' to 'POST'
            else targetType = 'POST';
        } else if (effectivePlatform === 'DZEN') {
            if (fullContent.includes('стать') || fullContent.includes('article')) targetType = 'POST';
            else if (category === 'SUBSCRIBERS') targetType = 'CHANNEL';
            else targetType = 'POST'; // Changed from 'VIDEO' to 'POST'
        } else {
            if (isAuto) targetType = 'CHANNEL_POSTS';
            else if (['SUBSCRIBERS', 'GROUPS', 'FRIENDS'].includes(category)) {
                 targetType = 'CHANNEL'; // Simplified to CHANNEL for all
            } else if (fullContent.includes('video') || fullContent.includes('reel') || fullContent.includes('shorts')) {
                targetType = 'POST'; // Changed from 'VIDEO' to 'POST'
            } else {
                targetType = 'POST';
            }
        }

        // 4. Descriptions & Requirements
        const isFast = fullContent.includes('fast') || fullContent.includes('быстр');
        const isHQ = fullContent.includes('hq') || fullContent.includes('high quality');
        
        const desc = (sanitizedDescription && sanitizedDescription.length > 20) 
            ? sanitizedDescription 
            : `Услуга продвижения для ${PLATFORM_LABELS[effectivePlatform] || 'соцсетей'}.`;

        let requirements = '';
        const reqKeywords = ['link:', 'url:', 'формат:', 'link format:', 'требование:', 'пример:', 'ссылка:', 'example:', 'requirement:'];
        const lines = (sanitizedDescription || '').split('\n');
        for (const line of lines) {
            const lowLine = line.toLowerCase();
            if (reqKeywords.some(k => lowLine.includes(k))) {
                requirements += line.trim() + ' ';
            }
        }

        return {
            platform: platformEnum,
            platformSlug,
            category: category as any,
            targetType,
            isPrivate,
            description_ru: desc,
            suggestedName: name.replace(/\[.*?\]/g, '').trim(),
            requirements: requirements.trim() || undefined,
            geo,
            warranty
        };
    }

    static suggestTargetType(name: string, category: string, description: string = ''): string {
        return this.detectSync(name, description, category).targetType;
    }

    static suggestIsPrivate(name: string): boolean {
        return this.detectSync(name).isPrivate;
    }

    static suggestCategory(name: string, category: string = ''): Category {
        return this.detectSync(name, '', category).category;
    }
}
