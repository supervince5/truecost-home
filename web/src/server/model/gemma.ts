import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { AnalysisError } from "../errors";
import { CONDITION_PROMPT } from "./prompt";
import type { ModelProvider } from "./provider";

const MODEL_IDS = ["gemma-4-26b-a4b-it", "gemma-4-31b-it"];
export function createGemmaProvider(config: { apiKey: string; modelId: string }, transport?: typeof fetch): ModelProvider {
  if (!config.apiKey.trim() || !MODEL_IDS.includes(config.modelId)) throw new AnalysisError("NOT_CONFIGURED");
  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
    vertexai: false,
    enterprise: false,
    apiVersion: "v1beta",
    httpOptions: { baseUrl: "https://generativelanguage.googleapis.com", retryOptions: { attempts: 1 }, ...(transport ? { fetch: transport } : {}) },
  });
  return {
    modelId: config.modelId,
    async generate(evidence, options) {
      const parts: Part[] = evidence.images.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.data } }));
      parts.push({ text: JSON.stringify({ imageOrder: evidence.images.map((image) => image.sourceId), property: evidence.property, sources: evidence.sources }) });
      if (options.correctiveAttempt) parts.push({ text: "The preceding attempt did not satisfy the output contract. Re-extract from the original evidence. Return only valid JSON and verifiable references. Omit unsupported findings." });
      const response = await ai.models.generateContent({
        model: config.modelId,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: CONDITION_PROMPT,
          temperature: 0,
          maxOutputTokens: 4096,
          candidateCount: 1,
          thinkingConfig: { thinkingLevel: evidence.images.length && evidence.photoReviewMode === "deliberate" ? ThinkingLevel.HIGH : ThinkingLevel.MINIMAL },
          abortSignal: options.signal,
          automaticContinuation: false,
          httpOptions: { timeout: evidence.images.length ? 75000 : 40000, retryOptions: { attempts: 1 } },
        },
      }).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 429) throw new AnalysisError("RATE_LIMITED");
        if (error instanceof ApiError && [500, 502, 503, 504].includes(error.status)) throw new AnalysisError("PROVIDER_UNAVAILABLE");
        throw error;
      });
      if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason !== "STOP") throw new AnalysisError("PROVIDER_ERROR");
      // Prompted JSON, not an unverified claim of provider-enforced structured output.
      return { text: response.text ?? "", modelVersion: response.modelVersion ?? null, inputTokens: response.usageMetadata?.promptTokenCount ?? null, outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
        thinkingTokens: response.usageMetadata?.thoughtsTokenCount ?? null, totalTokens: response.usageMetadata?.totalTokenCount ?? null };
    },
  };
}

export function getGemmaProvider(): ModelProvider {
  return createGemmaProvider({ apiKey: process.env.GEMMA_API_KEY ?? "", modelId: process.env.GEMMA_MODEL_ID ?? "gemma-4-26b-a4b-it" });
}
