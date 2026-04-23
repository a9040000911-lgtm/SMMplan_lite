/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { ProjectService } from '@/services/core';

import { redis } from '@/lib/redis';

// Simple fast hash for token to not expose it explicitly in redis keys
const hashToken = (token: string) => Buffer.from(token).toString('base64').substring(0, 16);

export const projectMiddleware = async (ctx: any, next: any) => {
    const token = ctx.telegram.token;
    const cacheKey = `bot_project:${hashToken(token)}`;
    
    let project: any = null;
    
    try {
        const cached = await redis.get(cacheKey);
        if (cached) project = JSON.parse(cached);
    } catch(e) { console.error('[ProjectMiddleware] Redis error:', e); }

    if (!project) {
        project = await ProjectService.getByBotToken(token);
        if (!project) {
            project = await ProjectService.ensureDefaultProject();
        }
        
        try {
            // Cache project for 10 minutes (600 seconds)
            if (project) await redis.set(cacheKey, JSON.stringify(project), 'EX', 600);
        } catch(e) {}
    }

    ctx.project = project;
    return next();
};


