import { createAnalyzeHandler } from "@/server/analysis/handler";
import { getGemmaProvider } from "@/server/model/gemma";

export const runtime = "nodejs";
// Allow image preparation and the existing 75-second inference deadline on Vercel.
export const maxDuration = 120;
export const POST = createAnalyzeHandler(getGemmaProvider);
