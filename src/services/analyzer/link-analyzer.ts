import { IntelligencePlatform, LINK_RULES } from './link-rules';

export interface IntelligenceLinkMetadata {
    isLive?: boolean;
    context?: string;
}

export interface IntelligenceAnalysisResult {
    platform: IntelligencePlatform;
    type: string;
    id: string;
    canonicalUrl: string;
    metadata: IntelligenceLinkMetadata;
    suggestedCategories: string[];
    warnings: string[];
}

export class IntelligenceLinkAnalyzer {
    
    async analyze(rawUrl: string): Promise<IntelligenceAnalysisResult> {
        if (!rawUrl || rawUrl.trim() === '') {
             return this.getFallbackResult(rawUrl);
        }
        const sanitizedUrl = this.sanitize(rawUrl);
        const expandedUrl = await this.resolve(sanitizedUrl);
        return this.match(expandedUrl);
    }

    private sanitize(url: string): string {
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
            const blackList = ['utm_', 'igshid', 'feature', 'si', 'ref'];
            
            const keysToDelete: string[] = [];
            searchParams.forEach((_, key) => {
                if (blackList.some(p => key.startsWith(p))) {
                    keysToDelete.push(key);
                }
            });
            
            keysToDelete.forEach(k => searchParams.delete(k));
            return urlObj.toString();
        } catch (_e) {
            return url.trim();
        }
    }

    private async resolve(url: string): Promise<string> {
        const shortDomains = ['bit.ly', 'youtu.be', 'vm.tiktok.com', 't.co', 'cutt.ly'];
        if (shortDomains.some(d => url.includes(d))) {
            if (url.includes('youtu.be/')) {
                return url.replace('youtu.be/', 'youtube.com/watch?v=');
            }
        }
        return url;
    }

    private match(url: string): IntelligenceAnalysisResult {
        for (const rule of LINK_RULES) {
            const match = url.match(rule.pattern);
            if (match) {
                return {
                    platform: rule.platform,
                    type: rule.type,
                    id: match[1] || match[2] || match[3] || 'unknown',
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

    private getFallbackResult(url: string): IntelligenceAnalysisResult {
        return {
            platform: IntelligencePlatform.OTHER,
            type: 'generic_link',
            id: 'none',
            canonicalUrl: url,
            metadata: {},
            suggestedCategories: [],
            warnings: ['platform_not_supported']
        }
    }
}
