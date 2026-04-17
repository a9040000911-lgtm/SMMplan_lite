"use server";

import { IntelligenceLinkAnalyzer } from "@/services/analyzer/link-analyzer";

const analyzer = new IntelligenceLinkAnalyzer();

export async function analyzeUrl(url: string) {
  try {
    const result = await analyzer.analyze(url);
    return { success: true, data: result };
  } catch (error) {
    console.error("Link analysis failed:", error);
    return { success: false, error: "Failed to analyze URL" };
  }
}
