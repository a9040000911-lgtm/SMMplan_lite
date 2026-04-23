"use server";

import { IntelligenceLinkAnalyzer } from "@/services/analyzer/link-analyzer";
import { IntelligencePlatform } from "@/services/analyzer/link-rules";
import { RateLimitService } from '@/services/core/rate-limit.service';
import { verifySession } from '@/lib/session';

export async function analyzeUrl(url: string) {
  try {
    const isAllowed = await RateLimitService.check("analyzeUrl", 30, 60); // 30 requests per minute
    if (!isAllowed) {
       return { success: false, error: "Too many URL analysis requests." };
    }

    const analyzer = new IntelligenceLinkAnalyzer();
    const result = await analyzer.analyze(url);
    
    if (!result) {
        return { success: false, error: "Failed to recognize link" };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Link analysis failed:", error);
    return { success: false, error: "Failed to analyze URL" };
  }
}
