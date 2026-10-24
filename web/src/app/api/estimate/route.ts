import { readJson } from "../../../server/analysis/handler";
import { costCatalog, estimateCosts } from "../../../server/costs/engine";
import { sourceById } from "../../../lib/condition/knowledge";
import { AnalysisError } from "../../../server/errors";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  return Response.json({ catalogVersion: "2026-10-24-v1", scopes: costCatalog.map((record) => ({ ...record, source: sourceById.get(record.sourceId) })), limitation: "Planning ranges only. Scope confirmation and geography checks apply to POST requests." }, { headers });
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new AnalysisError("FORBIDDEN");
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new AnalysisError("UNSUPPORTED_MEDIA");
    const input = await readJson(request, 65536);
    return Response.json(estimateCosts(input), { headers });
  } catch (error) {
    const safe = error instanceof AnalysisError ? error : new AnalysisError("INVALID_INPUT");
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status, headers });
  }
}
