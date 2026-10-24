import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { setTimeout as realDelay } from "node:timers/promises";
import { AnalysisError } from "../../src/server/errors";
import { prepareEvidence } from "../../src/server/evidence/prepare";
import { extract } from "../../src/server/analysis/extract";
import { createGemmaProvider } from "../../src/server/model/gemma";
import { createAnalyzeHandler } from "../../src/server/analysis/handler";
import type { ModelProvider } from "../../src/server/model/provider";

const input = { listingText: "Heating system installed in 2006." };
const good = { findings: [{ id: "f1", component: "heating_system", conditionState: "unknown", description: "Listing reports installation in 2006; condition unknown.", evidenceClass: "disclosed_fact", evidence: [{ kind: "text", sourceId: "listing-1", quote: "Heating system installed in 2006." }], needsProfessionalAssessment: true, followUpQuestion: "Has its condition been professionally assessed?" }], unassessedComponents: ["roof"] };
function provider(outputs: string[]): ModelProvider {
  let call = 0;
  return { modelId: "gemma-4-26b-a4b-it", generate: async () => ({ text: outputs[Math.min(call++, outputs.length - 1)], modelVersion: "gemma-4-26b-a4b-it", inputTokens: 100, outputTokens: 40 }) };
}

describe("evidence preparation", () => {
  it("assigns source IDs itself and preserves page numbers", async () => {
    const prepared = await prepareEvidence({ ...input, reportPages: ["Ceiling stain.", "Roof inaccessible."] });
    expect(prepared.sources).toEqual([{ id: "listing-1", kind: "listing_text", text: input.listingText }, { id: "report-1", kind: "inspection_report", pages: ["Ceiling stain.", "Roof inaccessible."] }]);
  });
  it.each([{ budget: { savings: 5000 } }, { apiKey: "secret" }, { imageUrl: "http://localhost/private" }, { sources: [{ id: "forged" }] }])("rejects extra fields before provider access: %j", async (extra) => {
    await expect(prepareEvidence({ ...input, ...extra })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("rejects empty evidence", async () => {
    await expect(prepareEvidence({})).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("rejects text exceeding the shared input budget", async () => {
    await expect(prepareEvidence({ listingText: "x".repeat(16000), reportPages: ["y".repeat(16000)] })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
  it("decodes images and strips metadata by re-encoding", async () => {
    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().withMetadata().toBuffer();
    const prepared = await prepareEvidence({ images: [{ mimeType: "image/png", data: image.toString("base64") }] });
    expect(prepared.sources).toEqual([{ id: "photo-1", kind: "image", label: "Photo 1" }]);
    const decoded = await sharp(Buffer.from(prepared.images[0].data, "base64")).metadata();
    expect(decoded.format).toBe("jpeg");
    expect(decoded.exif).toBeUndefined();
    expect(decoded.width).toBe(8);
  });
  it.each(["<svg onload=alert(1)>", "not an image"])("rejects forged image bytes", async (bytes) => {
    await expect(prepareEvidence({ images: [{ mimeType: "image/png", data: Buffer.from(bytes).toString("base64") }] })).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });
  it("rejects a MIME mismatch", async () => {
    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
    await expect(prepareEvidence({ images: [{ mimeType: "image/jpeg", data: image.toString("base64") }] })).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });
});

describe("extraction pipeline", () => {
  it.each([[false, 40000], [true, 75000]] as const)("bounds a stalled provider with photo=%s", async (photo, deadline) => {
    const evidence = await prepareEvidence(input);
    if (photo) evidence.images.push({ sourceId: "photo-1", mimeType: "image/jpeg", data: "test" });
    const fake = provider([]); fake.generate = () => new Promise(() => {});
    vi.useFakeTimers();
    try {
      const pending = extract(evidence, fake).then(() => "unexpected success", (error) => error.code);
      await vi.advanceTimersByTimeAsync(deadline);
      expect(await pending).toBe("TIMEOUT");
    } finally { vi.useRealTimers(); }
  });
  it("lets a photo retry finish after a slow upstream failure", async () => {
    const evidence = await prepareEvidence(input);
    evidence.images.push({ sourceId: "photo-1", mimeType: "image/jpeg", data: "test" });
    evidence.sources.push({ id: "photo-1", kind: "image", label: "Photo 1" });
    const fake = provider([]);
    let calls = 0;
    fake.generate = async () => {
      await new Promise((resolve) => setTimeout(resolve, ++calls === 1 ? 21000 : 30000));
      if (calls === 1) throw new AnalysisError("PROVIDER_UNAVAILABLE");
      return { text: JSON.stringify(good), modelVersion: null, inputTokens: 10, outputTokens: 10 };
    };
    vi.useFakeTimers();
    try {
      const pending = extract(evidence, fake).then((result) => ({ result, error: null }), (error) => ({ result: null, error }));
      await vi.advanceTimersByTimeAsync(21000);
      // Node promise-timers remain real under this Vitest timer implementation.
      await realDelay(850);
      await vi.advanceTimersByTimeAsync(30000);
      const outcome = await pending;
      expect(outcome.error).toBeNull();
      expect(outcome.result?.metadata).toMatchObject({ attempts: 2, inputTokens: null });
    } finally { vi.useRealTimers(); }
  });
  it("returns validated findings with attribution, usage and mandatory review", async () => {
    const result = await extract(await prepareEvidence(input), provider([JSON.stringify(good)]));
    expect(result.findings[0].evidence[0].sourceId).toBe("listing-1");
    expect(result.reviewRequired).toBe(true);
    expect(result.metadata).toMatchObject({ attempts: 1, inputTokens: 100, outputTokens: 40 });
    expect(result.unassessedComponents).toContain("electrical");
  });
  it("allows one corrective retry and accounts for both calls", async () => {
    const result = await extract(await prepareEvidence(input), provider(["not json", JSON.stringify(good)]));
    expect(result.metadata).toMatchObject({ attempts: 2, inputTokens: 200, outputTokens: 80 });
  });
  it("accepts one complete JSON code fence without changing the enclosed data", async () => {
    const result = await extract(await prepareEvidence(input), provider(["```json\n" + JSON.stringify(good) + "\n```"]));
    expect(result.metadata.attempts).toBe(1);
    expect(result.findings[0].description).toBe(good.findings[0].description);
  });
  it("rejects surrounding prose rather than extracting a convenient JSON substring", async () => {
    await expect(extract(await prepareEvidence(input), provider(["This house is safe.\n```json\n" + JSON.stringify(good) + "\n```"]))).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
  });
  it.each(["{", JSON.stringify({ ...good, findings: [{ ...good.findings[0], evidence: [{ kind: "text", sourceId: "invented", quote: "Heating system installed in 2006." }] }] }), JSON.stringify({ ...good, findings: [{ ...good.findings[0], evidence: [{ kind: "text", sourceId: "listing-1", quote: "New roof in 2026" }] }] })])("never accepts unsupported output or silently substitutes a fixture", async (bad) => {
    const fake = provider([bad]); const generate = vi.spyOn(fake, "generate");
    await expect(extract(await prepareEvidence(input), fake)).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
    expect(generate).toHaveBeenCalledTimes(2);
  });
  it("rejects duplicate finding IDs", async () => {
    await expect(extract(await prepareEvidence(input), provider([JSON.stringify({ ...good, findings: [good.findings[0], good.findings[0]] })]))).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
  });
  it("does not retry transport failures", async () => {
    const fake = provider([]); const generate = vi.spyOn(fake, "generate").mockRejectedValue(new Error("private upstream detail"));
    await expect(extract(await prepareEvidence(input), fake)).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("enforces an overall deadline even if a provider fails to honor cancellation", async () => {
    const fake = provider([]); fake.generate = () => new Promise(() => {});
    await expect(extract(await prepareEvidence(input), fake, { timeoutMs: 10 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });
  it("rejects an unexpected returned model family", async () => {
    const fake = provider([]); fake.generate = async () => ({ text: JSON.stringify(good), modelVersion: "gemini-other", inputTokens: 1, outputTokens: 1 });
    await expect(extract(await prepareEvidence(input), fake)).rejects.toMatchObject({ code: "MODEL_MISMATCH" });
  });
});

describe("Google SDK boundary", () => {
  it("allows a photo response beyond 40 seconds through the real SDK", async () => {
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
    const evidence = await prepareEvidence({ images: [{ mimeType: "image/png", data: bytes.toString("base64") }] });
    const transport: typeof fetch = (_, init) => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(sdkResponse(JSON.stringify({ findings: [], unassessedComponents: [] }))), 50000);
      init?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
    });
    vi.useFakeTimers();
    try {
      const pending = extract(evidence, createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport))
        .then((result) => ({ result, error: null }), (error) => ({ result: null, error }));
      await vi.advanceTimersByTimeAsync(50000);
      const outcome = await pending;
      expect(outcome.error).toBeNull();
      expect(outcome.result?.metadata.attempts).toBe(1);
    } finally { vi.useRealTimers(); }
  });
  it("preserves image order and source mapping before the text task", async () => {
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
    let parts: Array<{ inlineData?: unknown; text?: string }> = [];
    const transport: typeof fetch = async (_, init) => {
      parts = JSON.parse(String(init?.body)).contents[0].parts;
      return sdkResponse(JSON.stringify({ findings: [], unassessedComponents: [] }));
    };
    await extract(await prepareEvidence({ images: [{ mimeType: "image/png", data: bytes.toString("base64") }] }), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport));
    expect(parts[0].inlineData).toBeDefined();
    expect(JSON.parse(parts.at(-1)!.text!)).toMatchObject({ imageOrder: ["photo-1"], sources: [{ id: "photo-1", kind: "image" }] });
  });
  const sdkResponse = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, thoughtsTokenCount: 20, totalTokenCount: 160 } }), { headers: { "Content-Type": "application/json" } });
  const unavailable = () => new Response(JSON.stringify({ error: { code: 500, message: "private upstream detail", status: "INTERNAL" } }), { status: 500 });
  it("retries one server failure without pretending failed-call usage is known", async () => {
    const bodies: string[] = [];
    const transport: typeof fetch = async (_, init) => { bodies.push(String(init?.body)); return bodies.length === 1 ? unavailable() : sdkResponse(JSON.stringify(good)); };
    const result = await extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport));
    expect(result.metadata).toMatchObject({ attempts: 2, inputTokens: null, outputTokens: null });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).not.toContain("preceding attempt did not satisfy");
  });
  it("stops after two server failures and sanitizes the error", async () => {
    const transport = vi.fn(async () => unavailable());
    await expect(extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", message: "The model provider is temporarily unavailable. Try again later." });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it.each(["deadline", "cancellation"])("stops during retry backoff on %s", async (reason) => {
    const controller = new AbortController();
    const transport = vi.fn(async () => { if (reason === "cancellation") setTimeout(() => controller.abort(), 10); return unavailable(); });
    await expect(extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport), { signal: controller.signal, timeoutMs: reason === "deadline" ? 30 : 40000 })).rejects.toMatchObject({ code: reason === "deadline" ? "TIMEOUT" : "CANCELLED" });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("shares the two-call budget across contract and server failures", async () => {
    const bodies: string[] = [];
    const transport: typeof fetch = async (_, init) => { bodies.push(String(init?.body)); return bodies.length === 1 ? sdkResponse("invalid json") : unavailable(); };
    await expect(extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toContain("preceding attempt did not satisfy");
  });
  it("pins the Google endpoint and API mode despite ambient SDK configuration", async () => {
    vi.stubEnv("GOOGLE_GEMINI_BASE_URL", "https://unexpected.example");
    vi.stubEnv("GOOGLE_VERTEX_BASE_URL", "https://unexpected.example");
    vi.stubEnv("GOOGLE_GENAI_USE_VERTEXAI", "true");
    vi.stubEnv("GOOGLE_GENAI_USE_ENTERPRISE", "true");
    let observed = "";
    const transport: typeof fetch = async (url) => {
      observed = String(url);
      return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(good) }] }, finishReason: "STOP" }] }), { headers: { "Content-Type": "application/json" } });
    };
    try {
      await extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport));
      expect(new URL(observed).origin).toBe("https://generativelanguage.googleapis.com");
      expect(new URL(observed).pathname).toBe("/v1beta/models/gemma-4-26b-a4b-it:generateContent");
    } finally { vi.unstubAllEnvs(); }
  });
  it("sends evidence to the selected Gemma model with explicit output limits", async () => {
    let url = ""; let body: Record<string, unknown> = {}; let key = "";
    const transport: typeof fetch = async (request, init) => {
      url = String(request); body = JSON.parse(String(init?.body)); key = new Headers(init?.headers).get("x-goog-api-key") ?? "";
      return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(good) }] }, finishReason: "STOP" }], modelVersion: "gemma-4-26b-a4b-it", usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 40, thoughtsTokenCount: 20, totalTokenCount: 160 } }), { headers: { "Content-Type": "application/json" } });
    };
    const result = await extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test-key", modelId: "gemma-4-26b-a4b-it" }, transport));
    expect(url).toContain("/models/gemma-4-26b-a4b-it:generateContent");
    expect(key).toBe("test-key");
    expect(body.generationConfig).toMatchObject({ maxOutputTokens: 4096 });
    expect(body).not.toHaveProperty("tools");
    expect(JSON.stringify(body)).not.toContain("test-key");
    expect(result.metadata.modelId).toBe("gemma-4-26b-a4b-it");
    expect(result.metadata).toMatchObject({ thinkingTokens: 20, totalTokens: 160 });
  });
  it("returns a rate-limit error without retrying upstream 429", async () => {
    let calls = 0;
    const transport: typeof fetch = async () => { calls++; return new Response(JSON.stringify({ error: { code: 429, message: "rate limited", status: "RESOURCE_EXHAUSTED" } }), { status: 429 }); };
    await expect(extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport))).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(calls).toBe(1);
  });
  it("does not let SDK automatically continue a partial generation", async () => {
    let calls = 0;
    const transport: typeof fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text: "{" }] }, finishReason: "CONTINUATION" }], continuationToken: "opaque" }), { headers: { "Content-Type": "application/json" } });
    };
    await expect(extract(await prepareEvidence(input), createGemmaProvider({ apiKey: "test", modelId: "gemma-4-26b-a4b-it" }, transport))).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
    expect(calls).toBe(1);
  });
});

describe("HTTP boundary", () => {
  const request = (value: unknown, headers: Record<string, string> = {}) => new Request("http://localhost:3000/api/analyze", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
  it("returns a no-store validated result", async () => {
    const handler = createAnalyzeHandler(() => provider([JSON.stringify(good)]));
    const response = await handler(request(input));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ reviewRequired: true, findings: [{ id: "f1" }] });
  });
  it("rejects malformed input before constructing a provider", async () => {
    const factory = vi.fn(() => provider([])); const handler = createAnalyzeHandler(factory);
    expect((await handler(request({ ...input, budget: {} }))).status).toBe(400);
    expect(factory).not.toHaveBeenCalled();
  });
  it("rejects a foreign browser origin", async () => {
    expect((await createAnalyzeHandler(() => provider([]))(request(input, { Origin: "https://other.example" }))).status).toBe(403);
  });
  it("counts actual bytes instead of trusting Content-Length", async () => {
    const handler = createAnalyzeHandler(() => provider([]));
    expect((await handler(request({ listingText: "x".repeat(10 * 1024 * 1024) }, { "Content-Length": "1" }))).status).toBe(413);
  });
  it("returns stable errors without raw provider messages or secrets", async () => {
    const handler = createAnalyzeHandler(() => { throw new Error("KEY=private-secret"); });
    const response = await handler(request(input));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private-secret");
  });
  it("limits repeated requests in one process", async () => {
    const handler = createAnalyzeHandler(() => provider([JSON.stringify(good)]));
    for (let i = 0; i < 10; i++) expect((await handler(request(input))).status).toBe(200);
    expect((await handler(request(input))).status).toBe(429);
  });
  it("keeps the production endpoint disabled unless explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_ANALYZE_API", "false");
    try {
      const factory = vi.fn(() => provider([]));
      const response = await createAnalyzeHandler(factory)(request(input));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: { code: "DISABLED" } });
      expect(factory).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it("releases a stalled body immediately when the caller cancels", async () => {
    const controller = new AbortController();
    const stalled = new Request("http://localhost:3000/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: new ReadableStream(), signal: controller.signal, duplex: "half",
    } as RequestInit);
    const response = createAnalyzeHandler(() => provider([]))(stalled);
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    const result = await Promise.race([response, new Promise<Response>((resolve) => setTimeout(() => resolve(new Response(null, { status: 599 })), 100))]);
    expect(result.status).toBe(408);
  });
  it("admits at most two simultaneous requests and releases slots afterward", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fake = provider([JSON.stringify(good)]);
    const original = fake.generate;
    fake.generate = async (...args) => { await gate; return original(...args); };
    const handler = createAnalyzeHandler(() => fake);
    const first = handler(request(input));
    const second = handler(request(input));
    expect((await handler(request(input))).status).toBe(429);
    release();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
    expect((await handler(request(input))).status).toBe(200);
  });
});
