/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import type { Platform, Category } from '../types';
import { AnalysisResult, PlatformParser } from '../types';

export const VkParser: PlatformParser = {
  name: 'VK' as Platform,
  domains: ['vk.com', 'vk.me', 'vk.ru', 'm.vk.com', 'vkvideo.ru', 'vkplay.live', 'live.vkplay.ru'],
  parse(url: string): AnalysisResult | null {
    // Система защит от мусорных путей
    const systemPaths = ['/settings', '/messages', '/feed', '/friends', '/groups', '/apps', '/ads', '/manage', '/dev'];
    if (systemPaths.some(p => url.includes('vk.com' + p) || url.includes('vk.ru' + p) || url.includes('m.vk.com' + p))) {
      return null;
    }

    if (url.includes('clip')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'COMMENTS' as Category, 'REPOSTS' as Category], objectType: 'VK_CLIP' };
    if (url.includes('vkplay.live') || url.includes('live.vkvideo.ru')) return { platform: 'VK' as Platform, possibleCategories: ['STREAMS' as Category, 'VIEWS' as Category, 'SUBSCRIBERS' as Category, 'OTHER' as Category], objectType: 'VK_PLAY' };
    if (url.includes('video') || url.includes('vkvideo.ru')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'COMMENTS' as Category, 'REPOSTS' as Category], objectType: 'VK_VIDEO' };
    if (url.includes('photo')) return { platform: 'VK' as Platform, possibleCategories: ['LIKES' as Category, 'COMMENTS' as Category, 'SAVES' as Category], objectType: 'VK_PHOTO' };
    if (url.includes('album')) return { platform: 'VK' as Platform, possibleCategories: ['LIKES' as Category], objectType: 'VK_ALBUM' };
    if (url.includes('music/playlist') || url.includes('audio_playlist')) return { platform: 'VK' as Platform, possibleCategories: ['PLAYS' as Category, 'VIEWS' as Category, 'OTHER' as Category], objectType: 'VK_PLAYLIST' };
    if (url.includes('audio')) return { platform: 'VK' as Platform, possibleCategories: ['PLAYS' as Category, 'LIKES' as Category, 'REPOSTS' as Category, 'OTHER' as Category], objectType: 'VK_AUDIO' };
    if (url.includes('podcast')) return { platform: 'VK' as Platform, possibleCategories: ['PLAYS' as Category, 'VIEWS' as Category, 'OTHER' as Category], objectType: 'VK_PODCAST' };
    if (url.includes('topic-')) return { platform: 'VK' as Platform, possibleCategories: ['COMMENTS' as Category, 'VIEWS' as Category], objectType: 'VK_TOPIC' };
    if (url.includes('narrative-')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category], objectType: 'VK_STORY' };
    if (url.includes('story')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REACTIONS' as Category], objectType: 'VK_STORY' };
    if (url.includes('poll-') || url.includes('#poll') || url.includes('/app7198399')) return { platform: 'VK' as Platform, possibleCategories: ['POLLS' as Category], objectType: 'VK_POLL' };
    if (url.includes('call/')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category, 'OTHER' as Category], objectType: 'VK_CALL' };
    if (url.includes('/app')) return { platform: 'VK' as Platform, possibleCategories: ['OTHER' as Category], objectType: 'VK_APP' };
    if (url.includes('/live')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'OTHER' as Category], objectType: 'VK_PLAY' }; // Map generic VK live to VK_PLAY for now or keep separate if needed

    if (url.includes('@')) return { platform: 'VK' as Platform, possibleCategories: ['VIEWS' as Category, 'LIKES' as Category, 'REPOSTS' as Category], objectType: 'VK_ARTICLE' };

    if (url.includes('wall')) {
      if (url.includes('reply=') || url.includes('thread=')) {
        return { platform: 'VK' as Platform, possibleCategories: ['LIKES' as Category], objectType: 'VK_COMMENT' };
      }
      return { platform: 'VK' as Platform, possibleCategories: ['LIKES' as Category, 'REPOSTS' as Category, 'VIEWS' as Category, 'COMMENTS' as Category, 'SAVES' as Category], objectType: 'VK_WALL' };
    }

    if (url.includes('market-') || url.includes('product-')) return { platform: 'VK' as Platform, possibleCategories: ['LIKES' as Category, 'REPOSTS' as Category, 'COMMENTS' as Category], objectType: 'VK_MARKET' };

    if (url.includes('vk.me/')) return { platform: 'VK' as Platform, possibleCategories: ['OTHER' as Category], objectType: 'VK_DM' };

    // Advanced ID parsing
    const idPath = url.split('vk.com/').pop()?.split('?')[0];
    if (idPath) {
      if (/^id\d+$/.test(idPath)) return { platform: 'VK' as Platform, possibleCategories: ['FRIENDS' as Category, 'SUBSCRIBERS' as Category, 'OTHER' as Category], objectType: 'VK_PROFILE' };
      if (/^(club|public|event)\d+$/.test(idPath)) return { platform: 'VK' as Platform, possibleCategories: ['GROUPS' as Category, 'SUBSCRIBERS' as Category, 'OTHER' as Category], objectType: 'VK_GROUP' };

      // If it's a shortname (no dots, no slashes, at least 2 chars)
      if (/^[a-zA-Z0-9_]{2,}$/.test(idPath)) {
        return { platform: 'VK' as Platform, possibleCategories: ['GROUPS' as Category, 'SUBSCRIBERS' as Category, 'FRIENDS' as Category, 'OTHER' as Category], objectType: 'VK_GROUP' };
      }
    }

    return { platform: 'VK' as Platform, possibleCategories: ['GROUPS' as Category, 'SUBSCRIBERS' as Category, 'OTHER' as Category], objectType: 'VK_GROUP' };
  }
};


