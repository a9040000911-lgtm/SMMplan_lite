/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
export type Platform = string;
export type Category = string;

export type TargetType =
  | 'TG_CHANNEL' | 'TG_GROUP' | 'TG_POST' | 'TG_STORY' | 'TG_BOT' | 'TG_BOOST' | 'TG_PROXY' | 'TG_FOLDER' | 'TG_INVOICE' | 'TG_INVITE' | 'TG_STARS'
  | 'VK_PROFILE' | 'VK_GROUP' | 'VK_WALL' | 'VK_VIDEO' | 'VK_CLIP' | 'VK_PLAYLIST' | 'VK_PHOTO' | 'VK_PLAY' | 'VK_PLAY_CHANNEL' | 'VK_PLAY_LIVE' | 'VK_APP' | 'VK_PODCAST' | 'VK_AUDIO' | 'VK_CALL'
  | 'VK_TOPIC' | 'VK_ARTICLE' | 'VK_NARRATIVE' | 'VK_STORY' | 'VK_POLL' | 'VK_COMMENT' | 'VK_ALBUM' | 'VK_MARKET' | 'VK_DM'
  | 'IG_PROFILE' | 'IG_POST' | 'IG_REEL' | 'IG_STORY' | 'IG_HIGHLIGHT' | 'IG_GUIDE' | 'IG_AUDIO' | 'IG_EFFECT'
  | 'YT_CHANNEL' | 'YT_VIDEO' | 'YT_SHORT' | 'YT_LIVE' | 'YT_PLAYLIST' | 'YT_COMMUNITY' | 'YT_COMMENT'
  | 'TW_CHANNEL' | 'TW_VIDEO' | 'TW_CLIP'
  | 'DS_SERVER'
  | 'X_PROFILE' | 'X_POST'
  | 'FB_PROFILE' | 'FB_POST'
  | 'TH_PROFILE' | 'TH_POST'
  | 'RD_USER' | 'RD_SUBREDDIT' | 'RD_POST'
  | 'RT_CHANNEL' | 'RT_VIDEO'
  | 'DZ_CHANNEL' | 'DZ_ARTICLE' | 'DZ_VIDEO'
  | 'OK_PROFILE' | 'OK_GROUP' | 'OK_POST' | 'OK_PHOTO' | 'OK_VIDEO' | 'OK_AUDIO' | 'OK_PLAYLIST' | 'OK_MOMENT'
  | 'KC_CHANNEL' | 'KC_VIDEO'
  | 'LKE_PROFILE' | 'LKE_VIDEO'
  | 'WA_CHANNEL' | 'WA_GROUP'
  | 'SP_ARTIST' | 'SP_PLAYLIST' | 'SP_TRACK'
  | 'SC_USER' | 'SC_TRACK'
  | 'LI_PROFILE' | 'LI_COMPANY' | 'LI_POST'
  | 'PI_USER' | 'PI_PIN'
  | 'SN_PROFILE' | 'SN_STORY'
  | 'TR_CHANNEL'
  | 'MAX_CHANNEL' | 'MAX_GROUP' | 'MAX_POST' | 'MAX_PROFILE' | 'MAX_BOT'
  | 'TT_PROFILE' | 'TT_VIDEO'
  | 'KW_PROFILE' | 'KW_VIDEO'
  | 'YM_TRACK' | 'YM_ALBUM' | 'YM_ARTIST' | 'YM_PLAYLIST'
  | 'STEAM_PROFILE' | 'STEAM_GROUP' | 'STEAM_WORKSHOP' | 'STEAM_APP'
  | 'GOOGLE_MAPS' | 'GOOGLE_SEARCH' | 'GOOGLE_BUSINESS'
  | 'TROVO_CHANNEL'
  | 'YANDEX_MAPS' | 'YANDEX_SEARCH'
  | 'WEB_SITE'
  | 'ALL' | 'UNKNOWN';

export interface AnalysisResult {
  platform: Platform;
  possibleCategories: Category[];
  objectType: TargetType;
  isPrivate?: boolean;
  isAlbum?: boolean;
  isComment?: boolean;
}

export interface PlatformParser {
  name: Platform;
  domains: string[];
  parse(url: string): AnalysisResult | null;
}


