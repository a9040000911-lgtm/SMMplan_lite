/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Created by Artem (http://artmspektr.ru)
 * Unauthorized copying of this file is strictly prohibited.
 */
import { analyzeLink, AnalysisResult } from './index';

export type OmniEntry = {
    raw: string;
    type: 'LINK' | 'EMAIL' | 'UNKNOWN' | 'HANDLE';
    analysis?: AnalysisResult | null;
    isAmbiguous?: boolean;
};

/**
 * Parses a blob of text into structured OmniEntry objects.
 */
export function parseOmniInput(input: string): OmniEntry[] {
    const lines = input.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean);
    
    return lines.map(line => {
        // 1. Check for Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(line)) {
            return { raw: line, type: 'EMAIL' };
        }

        // 2. Check for Handle (@user)
        if (line.startsWith('@')) {
            return { raw: line, type: 'HANDLE' };
        }

        // 3. Try Link Analysis
        const analysis = analyzeLink(line);
        if (analysis) {
            return { 
                raw: line, 
                type: 'LINK', 
                analysis,
                // If it looks like a handle but was caught as a link (e.g. t.me/user), mark it.
                isAmbiguous: line.includes('/') && !line.startsWith('http')
            };
        }

        return { raw: line, type: 'UNKNOWN' };
    });
}
