import "server-only";
import { randomUUID } from "node:crypto";
import { AnalysisError } from "../errors";
import { prepareEvidence } from "../evidence/prepare";
import type { ModelProvider } from "../model/provider";
import { extract } from "./extract";

export async function readJson(request: Request, limit = 10 * 1024 * 1024) {
  if (Number(request.headers.get("content-length")) > limit) throw new AnalysisError("TOO_LARGE");
  if (!request.body) throw new AnalysisError("INVALID_INPUT");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  request.signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 10000);
  try {
    while (true) {
      if (request.signal.aborted) throw new AnalysisError("CANCELLED");
      const { value, done } = await reader.read();
      if (request.signal.aborted) throw new AnalysisError("CANCELLED");
      if (timedOut) throw new AnalysisError("TIMEOUT");
      if (done) break;
      size += value.length;
      if (size > limit) { void reader.cancel().catch(() => {}); throw new AnalysisError("TOO_LARGE"); }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown; }
    catch { throw new AnalysisError("INVALID_INPUT"); }
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

// A demo-process guard, not a distributed quota or authentication system.
export function createAnalyzeHandler(providerFactory: () => ModelProvider) {
  let active = 0;
  let windowStarted = Date.now();
  let count = 0;
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    const headers = { "Cache-Control": "no-store", "X-Request-Id": requestId };
    let admitted = false;
    try {
      if (process.env.NODE_ENV === "production" && process.env.ENABLE_ANALYZE_API !== "true") throw new AnalysisError("DISABLED");
      const origin = request.headers.get("origin");
      if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new AnalysisError("FORBIDDEN");
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AnalysisError("UNSUPPORTED_MEDIA");
      if (Date.now() - windowStarted >= 60000) { windowStarted = Date.now(); count = 0; }
      if (active >= 2 || count >= 10) throw new AnalysisError("RATE_LIMITED");
      active++; count++; admitted = true;
      const prepared = await prepareEvidence(await readJson(request));
      const result = await extract(prepared, providerFactory(), { signal: request.signal });
      return Response.json({ ...result, requestId }, { headers });
    } catch (error) {
      const safe = error instanceof AnalysisError ? error : new AnalysisError("PROVIDER_ERROR");
      return Response.json({ error: { code: safe.code, message: safe.message }, requestId }, { status: safe.status, headers: { ...headers, ...(safe.code === "RATE_LIMITED" ? { "Retry-After": "60" } : {}) } });
    } finally { if (admitted) active--; }
  };
}
