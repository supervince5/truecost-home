import { createAnalyzeHandler } from "@/server/analysis/handler";
import { getGemmaProvider } from "@/server/model/gemma";

export const runtime = "nodejs";
export const POST = createAnalyzeHandler(getGemmaProvider);
