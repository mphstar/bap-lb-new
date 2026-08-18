import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi di file .env. Silakan dapatkan API Key gratis di Google AI Studio (https://aistudio.google.com/) dan tambahkan ke .env."
    );
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
}

export const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview",
].filter(Boolean) as string[];

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response, usedModel: model };
    } catch (err: any) {
      lastError = err;
      const isQuotaOrUnavailable =
        err?.status === 404 ||
        err?.status === 429 ||
        err?.message?.includes("404") ||
        err?.message?.includes("429") ||
        err?.message?.includes("quota") ||
        err?.message?.includes("exceeded") ||
        err?.message?.includes("not found") ||
        err?.message?.includes("no longer available") ||
        err?.message?.includes("RESOURCE_EXHAUSTED");

      if (isQuotaOrUnavailable) {
        console.warn(`Model ${model} limit/unavailable (${err.message?.slice(0, 80)}...), trying next model...`);
        continue;
      }
      // If it's authentication error or bad request, throw immediately
      throw err;
    }
  }

  throw lastError;
}
