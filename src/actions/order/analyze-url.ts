"use server";

import { analyzeLink } from "@/services/analyzer/heavy";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { RateLimitService } from '@/services/core/rate-limit.service';
import { verifySession } from '@/lib/session';

export async function analyzeUrl(url: string) {
  try {
    const isAllowed = await RateLimitService.check("analyzeUrl", 30, 60); // 30 requests per minute
    if (!isAllowed) {
       return { success: false, error: "Too many URL analysis requests." };
    }

    const result = analyzeLink(url);
    
    if (!result) {
        return { success: false, error: "Failed to recognize link" };
    }

    // Map OmniAnalyzer output to SmartOrderForm expected shape
    const data = {
        platform: result.platform as unknown as IntelligencePlatform,
        type: result.objectType, 
        id: "unknown", // The new analyzer might not always extract ID, but UI doesn't strictly need it to filter
        canonicalUrl: url,
        metadata: {
            isLive: false,
            isPrivate: result.isPrivate,
            isAlbum: result.isAlbum
        },
        suggestedCategories: result.possibleCategories,
        warnings: []
    };

    return { success: true, data };
  } catch (error) {
    console.error("Link analysis failed:", error);
    return { success: false, error: "Failed to analyze URL" };
  }
}
