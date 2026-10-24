import "server-only";
import type { PreparedEvidence } from "../evidence/prepare";

export interface ModelResponse {
  text: string;
  modelVersion: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}
export interface ModelProvider {
  readonly modelId: string;
  generate(evidence: PreparedEvidence, options: { signal: AbortSignal; correctiveAttempt: boolean }): Promise<ModelResponse>;
}
