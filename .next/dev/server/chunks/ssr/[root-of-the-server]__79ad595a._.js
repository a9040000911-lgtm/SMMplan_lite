module.exports = [
"[project]/src/services/analyzer/link-rules.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IntelligencePlatform",
    ()=>IntelligencePlatform,
    "LINK_RULES",
    ()=>LINK_RULES
]);
var IntelligencePlatform = /*#__PURE__*/ function(IntelligencePlatform) {
    IntelligencePlatform["YOUTUBE"] = "YOUTUBE";
    IntelligencePlatform["INSTAGRAM"] = "INSTAGRAM";
    IntelligencePlatform["TELEGRAM"] = "TELEGRAM";
    IntelligencePlatform["TIKTOK"] = "TIKTOK";
    IntelligencePlatform["VK"] = "VK";
    IntelligencePlatform["TWITCH"] = "TWITCH";
    IntelligencePlatform["TWITTER"] = "TWITTER";
    IntelligencePlatform["WEBSITE"] = "WEBSITE";
    IntelligencePlatform["LIKEE"] = "LIKEE";
    IntelligencePlatform["OTHER"] = "OTHER";
    return IntelligencePlatform;
}({});
const LINK_RULES = [
    {
        platform: "YOUTUBE",
        type: 'video',
        pattern: /(?:v=|be\/|shorts\/|embed\/)([\w-]{6,12})/,
        suggestedCategories: [
            'VIEWS',
            'LIKES',
            'REVIEWS',
            'SEO_BOOST'
        ],
        context: 'high_retention_target'
    },
    {
        platform: "YOUTUBE",
        type: 'channel',
        pattern: /youtube\.com\/(?:@|channel\/|user\/)([\w-.]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'CHANNEL_AUDIT'
        ],
        context: 'authority_growth'
    },
    {
        platform: "INSTAGRAM",
        type: 'post',
        pattern: /instagram\.com\/(?:p|reel|tv)\/([\w-]+)/,
        suggestedCategories: [
            'LIKES',
            'SAVES',
            'REPOSTS',
            'IMPRESSIONS'
        ],
        context: 'viral_momentum'
    },
    {
        platform: "INSTAGRAM",
        type: 'profile',
        pattern: /(?:instagram\.com|ig\.me)\/([\w._]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'STORY_VIEWS',
            'PROFILE_VISITS'
        ],
        context: 'trust_building'
    },
    {
        platform: "TELEGRAM",
        type: 'channel',
        pattern: /t\.me\/(?:joinchat\/|\+)?([\w_-]+)$|web\.telegram\.org\/(?:k|a)\/#@([\w_-]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'VIEWS',
            'REACTIONS_PREMIUM'
        ],
        context: 'global_search_optimization'
    },
    {
        platform: "TELEGRAM",
        type: 'post',
        pattern: /t\.me\/[\w_-]+\/(?:s\/)?(\d+)/,
        suggestedCategories: [
            'VIEWS',
            'REACTIONS'
        ],
        context: 'engagement'
    },
    {
        platform: "TELEGRAM",
        type: 'bot',
        pattern: /t\.me\/(?:[\w_-]+bot|[\w_-]+_bot)/,
        suggestedCategories: [
            'BOT_START',
            'BOT_FEATURES'
        ],
        context: 'automation'
    },
    {
        platform: "TIKTOK",
        type: 'short_link',
        pattern: /(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\/([\w-]+)/,
        suggestedCategories: [
            'VIEWS',
            'LIKES',
            'REPOSTS'
        ],
        context: 'mobile_viral'
    },
    {
        platform: "VK",
        type: 'post',
        pattern: /(?:vk\.(?:com|ru)|vkvideo\.ru)\/(?:wall|clip|video)(-?\d+_\d+)/,
        suggestedCategories: [
            'LIKES',
            'REPOSTS',
            'VIEWS'
        ],
        context: 'social_reach'
    },
    {
        platform: "VK",
        type: 'profile',
        pattern: /vk\.(?:com|ru)\/([\w._]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'FRIENDS'
        ],
        context: 'networking'
    },
    {
        platform: "TWITCH",
        type: 'channel',
        pattern: /twitch\.tv\/([\w]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'VIEWS',
            'LIVE_VIEWERS'
        ],
        context: 'streaming_growth'
    },
    {
        platform: "TWITTER",
        type: 'profile',
        pattern: /(?:twitter\.com|x\.com)\/([\w]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'RETWEETS',
            'LIKES'
        ],
        context: 'social_presence'
    },
    {
        platform: "TIKTOK",
        type: 'video',
        pattern: /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
        suggestedCategories: [
            'VIEWS',
            'LIKES',
            'REPOSTS'
        ],
        context: 'viral_reach'
    },
    {
        platform: "TIKTOK",
        type: 'profile',
        pattern: /tiktok\.com\/(@[\w.]+)/,
        suggestedCategories: [
            'FOLLOWERS',
            'BATTLE_LIKES'
        ],
        context: 'influence'
    },
    {
        platform: "WEBSITE",
        type: 'seo_traffic',
        pattern: /[^:]+:[^ \n]+$/,
        suggestedCategories: [
            'TRAFFIC_ORGANIC',
            'TRAFFIC_KEYWORDS'
        ],
        context: 'seo_authority'
    },
    {
        platform: "LIKEE",
        type: 'video',
        pattern: /l\.likee\.video\/v\/([\w-]+)|likee\.video\/@[\w.]+\/video\/(\d+)/,
        suggestedCategories: [
            'LIKES',
            'VIEWS'
        ],
        context: 'mobile_viral'
    },
    {
        platform: "WEBSITE",
        type: 'direct_traffic',
        pattern: /^https?:\/\//,
        suggestedCategories: [
            'TRAFFIC_DIRECT',
            'SOCIAL_SIGNALS'
        ],
        context: 'visibility'
    }
];
}),
"[project]/src/services/analyzer/link-analyzer.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IntelligenceLinkAnalyzer",
    ()=>IntelligenceLinkAnalyzer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$analyzer$2f$link$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/analyzer/link-rules.ts [app-rsc] (ecmascript)");
;
class IntelligenceLinkAnalyzer {
    async analyze(rawUrl) {
        if (!rawUrl || rawUrl.trim() === '') {
            return this.getFallbackResult(rawUrl);
        }
        const sanitizedUrl = this.sanitize(rawUrl);
        const expandedUrl = await this.resolve(sanitizedUrl);
        return this.match(expandedUrl);
    }
    sanitize(url) {
        try {
            let cleanUrl = url.trim();
            cleanUrl = cleanUrl.split(' ')[0];
            cleanUrl = cleanUrl.split('%20')[0];
            // Only parse full URL if it has http scheme
            if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }
            const urlObj = new URL(cleanUrl);
            const searchParams = urlObj.searchParams;
            const blackList = [
                'utm_',
                'igshid',
                'feature',
                'si',
                'ref'
            ];
            const keysToDelete = [];
            searchParams.forEach((_, key)=>{
                if (blackList.some((p)=>key.startsWith(p))) {
                    keysToDelete.push(key);
                }
            });
            keysToDelete.forEach((k)=>searchParams.delete(k));
            return urlObj.toString();
        } catch (_e) {
            return url.trim();
        }
    }
    async resolve(url) {
        const shortDomains = [
            'bit.ly',
            'youtu.be',
            'vm.tiktok.com',
            't.co',
            'cutt.ly'
        ];
        if (shortDomains.some((d)=>url.includes(d))) {
            if (url.includes('youtu.be/')) {
                return url.replace('youtu.be/', 'youtube.com/watch?v=');
            }
        }
        return url;
    }
    match(url) {
        for (const rule of __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$analyzer$2f$link$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LINK_RULES"]){
            const match = url.match(rule.pattern);
            if (match) {
                return {
                    platform: rule.platform,
                    type: rule.type,
                    id: match[1] || 'unknown',
                    canonicalUrl: url,
                    metadata: {
                        isLive: url.includes('/live/') || url.includes('/reel/'),
                        context: rule.context
                    },
                    suggestedCategories: rule.suggestedCategories,
                    warnings: []
                };
            }
        }
        return this.getFallbackResult(url);
    }
    getFallbackResult(url) {
        return {
            platform: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$analyzer$2f$link$2d$rules$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IntelligencePlatform"].OTHER,
            type: 'generic_link',
            id: 'none',
            canonicalUrl: url,
            metadata: {},
            suggestedCategories: [],
            warnings: [
                'platform_not_supported'
            ]
        };
    }
}
}),
"[project]/src/actions/order/analyze-url.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"40edc01b5c1008ef35e55ab32df99562d136345c35":"analyzeUrl"},"",""] */ __turbopack_context__.s([
    "analyzeUrl",
    ()=>analyzeUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$analyzer$2f$link$2d$analyzer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/analyzer/link-analyzer.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
const analyzer = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$analyzer$2f$link$2d$analyzer$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["IntelligenceLinkAnalyzer"]();
async function analyzeUrl(url) {
    try {
        const result = await analyzer.analyze(url);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        console.error("Link analysis failed:", error);
        return {
            success: false,
            error: "Failed to analyze URL"
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    analyzeUrl
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(analyzeUrl, "40edc01b5c1008ef35e55ab32df99562d136345c35", null);
}),
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[externals]/node:util [external] (node:util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:util", () => require("node:util"));

module.exports = mod;
}),
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/src/lib/db.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__["PrismaClient"]({
    log: [
        'query',
        'error',
        'warn'
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[project]/src/lib/session.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSession",
    ()=>createSession,
    "verifySession",
    ()=>verifySession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/node/esm/jwt/sign.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/node/esm/jwt/verify.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-rsc] (ecmascript)");
;
;
;
const secretKey = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-v2';
const encodedKey = new TextEncoder().encode(secretKey);
async function createSession(userId) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
    // Создаем запись в БД
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].session.create({
        data: {
            userId,
            expiresAt
        }
    });
    // Шифруем ID сессии в JWT
    const sessionToken = await new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$sign$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SignJWT"]({
        sessionId: session.id,
        userId
    }).setProtectedHeader({
        alg: 'HS256'
    }).setIssuedAt().setExpirationTime('7d').sign(encodedKey);
    (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])()).set('session_token', sessionToken, {
        httpOnly: true,
        secure: ("TURBOPACK compile-time value", "development") === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/'
    });
}
async function verifySession() {
    const sessionToken = (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])()).get('session_token')?.value;
    if (!sessionToken) return null;
    try {
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$node$2f$esm$2f$jwt$2f$verify$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jwtVerify"])(sessionToken, encodedKey, {
            algorithms: [
                'HS256'
            ]
        });
        // Опционально можно сверять с БД
        return {
            userId: payload.userId
        };
    } catch (err) {
        return null;
    }
}
}),
"[project]/src/services/marketing.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketingService",
    ()=>MarketingService,
    "marketingService",
    ()=>marketingService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-rsc] (ecmascript)");
;
class MarketingService {
    /**
   * Evaluates volume discount tier based on total spent.
   * Returns generic tier names and their respective percent discount.
   */ getVolumeTier(totalSpentCents) {
        if (totalSpentCents >= 100_000_00) {
            return {
                name: 'PLATINUM',
                discountPercent: 15.0
            };
        }
        if (totalSpentCents >= 25_000_00) {
            return {
                name: 'GOLD',
                discountPercent: 10.0
            };
        }
        if (totalSpentCents >= 5_000_00) {
            return {
                name: 'SILVER',
                discountPercent: 5.0
            };
        }
        if (totalSpentCents >= 1_000_00) {
            return {
                name: 'BRONZE',
                discountPercent: 2.0
            };
        }
        return {
            name: 'REGULAR',
            discountPercent: 0.0
        };
    }
    /**
   * Calculates the final price for an order, applying the maximum available discount
   * between User Volume Tier, User Personal Discount, and Promo Code.
   */ async calculatePrice(userId, serviceId, quantity, promoCodeStr) {
        let user = null;
        if (userId) {
            user = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].user.findUnique({
                where: {
                    id: userId
                }
            });
        }
        const service = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].service.findUnique({
            where: {
                id: serviceId
            }
        });
        if (!service) throw new Error('Service not found');
        if (quantity < service.minQty || quantity > service.maxQty) {
            throw new Error(`Quantity must be between ${service.minQty} and ${service.maxQty}`);
        }
        // 1. Calculate base original price in Cents
        const providerCostPer1000Cents = service.rate * 100;
        const providerCostCents = Math.round(providerCostPer1000Cents / 1000 * quantity);
        const originalTotalCents = Math.round(providerCostCents * service.markup);
        // 2. Discover available discounts
        const volumeTier = user ? this.getVolumeTier(user.totalSpent) : {
            name: 'REGULAR',
            discountPercent: 0.0
        };
        let promoDiscountPercent = 0.0;
        if (promoCodeStr) {
            const promo = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].promoCode.findUnique({
                where: {
                    code: promoCodeStr
                }
            });
            if (promo && promo.isActive && promo.uses < promo.maxUses) {
                if (!promo.expiresAt || promo.expiresAt > new Date()) {
                    promoDiscountPercent = promo.discountPercent;
                }
            }
        }
        // 3. Find the maximum discount available to prevent margin squeeze
        // (We do not stack them additively)
        const maxDiscountPercent = Math.max(user?.personalDiscount || 0, volumeTier.discountPercent, promoDiscountPercent);
        // 4. Calculate Final Cents
        const discountCents = Math.round(originalTotalCents * maxDiscountPercent / 100);
        let totalCents = originalTotalCents - discountCents;
        // Failsafe: Never sell below provider cost
        if (totalCents < providerCostCents) {
            totalCents = providerCostCents; // zero markup, zero loss
        }
        return {
            totalCents,
            originalTotalCents,
            discountCents,
            discountPercent: maxDiscountPercent,
            providerCostCents,
            tier: volumeTier.name
        };
    }
    /**
   * Applies the use of a promo code atomically if required.
   */ async consumePromoCode(tx, promoCodeStr) {
        if (!promoCodeStr) return;
        const promo = await tx.promoCode.findUnique({
            where: {
                code: promoCodeStr
            }
        });
        if (promo && promo.isActive && promo.uses < promo.maxUses) {
            if (!promo.expiresAt || promo.expiresAt > new Date()) {
                await tx.promoCode.update({
                    where: {
                        id: promo.id
                    },
                    data: {
                        uses: {
                            increment: 1
                        }
                    }
                });
            }
        }
    }
}
const marketingService = new MarketingService();
}),
"[project]/src/services/providers/vexboost.provider.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VexboostProvider",
    ()=>VexboostProvider
]);
class VexboostProvider {
    apiKey;
    apiUrl;
    constructor(config){
        if (!config.apiUrl.startsWith('http')) {
            throw new Error(`Invalid API URL for VexboostProvider: ${config.apiUrl}`);
        }
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl;
    }
    buildUrl(params) {
        const searchParams = new URLSearchParams();
        searchParams.append('key', this.apiKey);
        for (const [key, value] of Object.entries(params)){
            searchParams.append(key, value);
        }
        return `${this.apiUrl}?${searchParams.toString()}`;
    }
    async safeFetch(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(()=>controller.abort(), 10000);
        options.signal = controller.signal;
        options.cache = 'no-store';
        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            return await response.json();
        } catch (e) {
            clearTimeout(timeoutId);
            if (e.name === 'AbortError') {
                throw new Error('Provider connection timeout (10s)');
            }
            throw new Error(`Provider Request Failed: ${e.message}`);
        }
    }
    async getServices() {
        const url = this.buildUrl({
            action: 'services'
        });
        const data = await this.safeFetch(url);
        let services = data;
        if (data && data.value && Array.isArray(data.value)) {
            services = data.value;
        }
        if (!Array.isArray(services)) {
            throw new Error('Invalid services data received from VexBoost');
        }
        return services;
    }
    async getBalance() {
        const url = this.buildUrl({
            action: 'balance'
        });
        const data = await this.safeFetch(url);
        return {
            balance: Math.round(parseFloat(data.balance) * 100),
            currency: data.currency
        };
    }
    async createOrder(serviceId, link, quantity, runs, interval) {
        try {
            const searchParams = new URLSearchParams();
            searchParams.append('key', this.apiKey);
            searchParams.append('action', 'add');
            searchParams.append('service', serviceId.toString());
            searchParams.append('link', link);
            searchParams.append('quantity', quantity.toString());
            if (runs && interval) {
                searchParams.append('runs', runs.toString());
                searchParams.append('interval', interval.toString());
            }
            const data = await this.safeFetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: searchParams.toString()
            });
            if (data && data.order) {
                return {
                    success: true,
                    externalId: data.order.toString(),
                    providerName: 'VexBoost',
                    rawData: data
                };
            } else {
                return {
                    success: false,
                    error: data?.error || 'Unknown error from VexBoost API',
                    rawData: data
                };
            }
        } catch (error) {
            console.error('Error creating VexBoost order:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async getStatus(externalId) {
        const url = this.buildUrl({
            action: 'status',
            order: externalId
        });
        const data = await this.safeFetch(url);
        return {
            status: data.status,
            remains: parseInt(data.remains || '0', 10),
            cost: Math.round(parseFloat(data.charge || '0') * 100),
            error: data.error
        };
    }
    async getStatuses(externalIds) {
        const url = this.buildUrl({
            action: 'status',
            orders: externalIds.join(',')
        });
        const data = await this.safeFetch(url);
        const results = {};
        for (const [id, orderData] of Object.entries(data)){
            if (typeof orderData === 'string') {
                results[id] = {
                    status: 'CANCELED',
                    remains: 0,
                    error: orderData
                };
            } else {
                const d = orderData;
                results[id] = {
                    status: d.status,
                    remains: parseInt(d.remains || '0', 10),
                    cost: Math.round(parseFloat(d.charge || '0') * 100),
                    error: d.error
                };
            }
        }
        return results;
    }
    async cancelOrder(externalId) {
        try {
            const url = this.buildUrl({
                action: 'cancel',
                order: externalId
            });
            const data = await this.safeFetch(url);
            if (data && !data.error) {
                return {
                    success: true
                };
            } else {
                return {
                    success: false,
                    error: data?.error || 'Cancellation failed'
                };
            }
        } catch (e) {
            return {
                success: false,
                error: e.message
            };
        }
    }
    async refillOrder(externalId) {
        try {
            const url = this.buildUrl({
                action: 'refill',
                order: externalId
            });
            const data = await this.safeFetch(url);
            if (data && data.refill) {
                return {
                    success: true
                };
            }
            return {
                success: false,
                error: data?.error || 'Refill failed or not supported'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}
}),
"[project]/src/services/providers/provider.service.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProviderService",
    ()=>ProviderService,
    "providerService",
    ()=>providerService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$providers$2f$vexboost$2e$provider$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/providers/vexboost.provider.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-rsc] (ecmascript)");
;
;
class ProviderService {
    /**
   * Retrieves all active providers from DB
   */ async getActiveProviders() {
        return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].provider.findMany({
            where: {
                isActive: true
            }
        });
    }
    /**
   * Main Factory Method
   * Returns instance of IProvider based on provider config
   */ getProviderInstance(config) {
        // In smmplan it uses the URL or Name to decide. We will use Name for simplicity.
        if (config.name.toLowerCase().includes('vexboost')) {
            return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$providers$2f$vexboost$2e$provider$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["VexboostProvider"](config);
        }
        // Future integrations (e.g. JustAnotherPanelProvider) will go here
        throw new Error(`Unsupported provider: ${config.name}`);
    }
    /**
   * Auto-resolves the default provider (for Smmplan Lite, we usually have one)
   */ async getDefaultProvider() {
        const provider = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].provider.findFirst({
            where: {
                isActive: true
            }
        });
        if (!provider) {
            throw new Error('No active providers found in the database. Please add one (e.g., Vexboost).');
        }
        return this.getProviderInstance(provider);
    }
}
const providerService = new ProviderService();
}),
"[project]/src/actions/order/checkout.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"70cad89742b2ba5bb0a7038a4735c81ff819784a1a":"calculatePriceAction","7e09db6037a95d8250282821410f0a924ad0345dca":"checkoutAction","7f976de69391f1ec1b956c0f1a71bd887f6459e4e9":"checkoutCore"},"",""] */ __turbopack_context__.s([
    "calculatePriceAction",
    ()=>calculatePriceAction,
    "checkoutAction",
    ()=>checkoutAction,
    "checkoutCore",
    ()=>checkoutCore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/session.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$marketing$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/marketing.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$providers$2f$provider$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/providers/provider.service.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
async function calculatePriceAction(serviceId, quantity, promoCodeStr) {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifySession"])().catch(()=>null);
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$marketing$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["marketingService"].calculatePrice(session?.userId || null, serviceId, quantity, promoCodeStr);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
async function checkoutAction(serviceId, link, quantity, promoCodeStr, runs, interval) {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifySession"])();
        if (!session) {
            return {
                success: false,
                error: 'Unauthorized'
            };
        }
        return await checkoutCore(session.userId, serviceId, link, quantity, promoCodeStr, runs, interval);
    } catch (error) {
        if (error.message === 'INSUFFICIENT_FUNDS') {
            return {
                success: false,
                error: 'Недостаточно средств на балансе'
            };
        }
        return {
            success: false,
            error: error.message
        };
    }
}
async function checkoutCore(userId, serviceId, link, quantity, promoCodeStr, runs, interval) {
    try {
        // 1. Double check and calculate final price
        const pricing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$marketing$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["marketingService"].calculatePrice(userId, serviceId, quantity, promoCodeStr);
        // 2. Wrap creation in transaction to prevent concurrency balance attacks
        const orderId = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].$transaction(async (tx)=>{
            // Re-fetch user lock inside transaction to ensure precise balance
            const lockUser = await tx.user.findUnique({
                where: {
                    id: userId
                }
            });
            if (!lockUser || lockUser.balance < pricing.totalCents) {
                throw new Error('INSUFFICIENT_FUNDS');
            }
            // Deduct balance & increment totalSpent
            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    balance: {
                        decrement: pricing.totalCents
                    },
                    totalSpent: {
                        increment: pricing.totalCents
                    }
                }
            });
            // Consume Promo Code
            if (promoCodeStr) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$marketing$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["marketingService"].consumePromoCode(tx, promoCodeStr);
            }
            // Create Order
            const newOrder = await tx.order.create({
                data: {
                    userId,
                    serviceId,
                    link,
                    quantity,
                    status: 'PENDING',
                    charge: pricing.totalCents,
                    providerCost: pricing.providerCostCents,
                    remains: quantity,
                    runs,
                    interval
                }
            });
            return newOrder.id;
        });
        // 3. Try to push it to provider immediately (Best Effort)
        try {
            const provider = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$providers$2f$provider$2e$service$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["providerService"].getDefaultProvider();
            // In a real SMM script we might need to map our Internal service ID to Provider's external ID
            // but here we just pass the ID as string.
            const externalRes = await provider.createOrder(serviceId, link, quantity, runs, interval);
            if (externalRes.success && externalRes.externalId) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        externalId: externalRes.externalId,
                        status: 'IN_PROGRESS'
                    }
                });
            } else {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        error: externalRes.error || 'Failed to submit to provider',
                        status: 'ERROR'
                    }
                });
            }
        } catch (e) {
            console.error('[Checkout] Provider submission error:', e);
        // Even if provider fails, order is saved securely as PENDING. A sync worker can retry later.
        }
        return {
            success: true,
            orderId
        };
    } catch (error) {
        throw error;
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    calculatePriceAction,
    checkoutAction,
    checkoutCore
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(calculatePriceAction, "70cad89742b2ba5bb0a7038a4735c81ff819784a1a", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(checkoutAction, "7e09db6037a95d8250282821410f0a924ad0345dca", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(checkoutCore, "7f976de69391f1ec1b956c0f1a71bd887f6459e4e9", null);
}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/order/analyze-url.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/actions/order/checkout.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$analyze$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/order/analyze-url.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/order/checkout.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/order/analyze-url.ts [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/src/actions/order/checkout.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "40edc01b5c1008ef35e55ab32df99562d136345c35",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$analyze$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["analyzeUrl"],
    "70cad89742b2ba5bb0a7038a4735c81ff819784a1a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["calculatePriceAction"],
    "7e09db6037a95d8250282821410f0a924ad0345dca",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["checkoutAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$order$2f$analyze$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$order$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/order/analyze-url.ts [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/src/actions/order/checkout.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$analyze$2d$url$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/order/analyze-url.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$order$2f$checkout$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/order/checkout.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__79ad595a._.js.map