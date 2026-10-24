import { afterEach, expect, it, vi } from "vitest";
import { POST } from "../../src/app/api/estimate/route";
afterEach(() => vi.useRealTimers());
const req = (body: string, origin = "http://localhost") => new Request("http://localhost/api/estimate", { method: "POST", headers: { "Content-Type": "application/json", origin }, body });
it("returns a cited estimate through the API", async () => {
  vi.setSystemTime(new Date("2026-10-24"));
  const response = await POST(req(JSON.stringify({ region: "northern_virginia", items: [{ catalogId: "roof_pipe_boot", quantity: 1, scopeConfirmed: true }] })));
  expect(response.status).toBe(200);
  expect((await response.json()).total).toEqual({ lowCents: 25000, highCents: 65000 });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("rejects injected prices and malformed bodies", async () => {
  expect((await POST(req('{"price":1}'))).status).toBe(400);
  expect((await POST(req('{'))).status).toBe(400);
});
it("bounds bytes and rejects cross-origin requests", async () => {
  expect((await POST(req(' '.repeat(65537)))).status).toBe(413);
  expect((await POST(req('{}', "https://elsewhere.test"))).status).toBe(403);
});
