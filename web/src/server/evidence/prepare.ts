import "server-only";
import sharp from "sharp";
import { extractionRequestSchema } from "../../lib/schemas/extraction";
import type { EvidenceSource } from "../../lib/schemas/evidence";
import { AnalysisError } from "../errors";

export interface PreparedEvidence {
  sources: EvidenceSource[];
  images: { sourceId: string; mimeType: "image/jpeg"; data: string }[];
  property: { yearBuilt: number | null } | null;
}
export async function prepareEvidence(raw: unknown): Promise<PreparedEvidence> {
  const parsed = extractionRequestSchema.safeParse(raw);
  if (!parsed.success) throw new AnalysisError("INVALID_INPUT");
  const input = parsed.data;
  const sources: EvidenceSource[] = [];
  const images: PreparedEvidence["images"] = [];
  if (input.listingText) sources.push({ id: "listing-1", kind: "listing_text", text: input.listingText });
  if (input.reportPages.length) sources.push({ id: "report-1", kind: "inspection_report", pages: input.reportPages });
  for (const [index, image] of input.images.entries()) {
    try {
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data)) throw new Error("base64");
      const bytes = Buffer.from(image.data, "base64");
      if (bytes.length > 1024 * 1024) throw new Error("bytes");
      const options = { limitInputPixels: 12000000, failOn: "warning" as const };
      const metadata = await sharp(bytes, options).metadata();
      const format = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" }[image.mimeType];
      if (metadata.format !== format || (metadata.pages ?? 1) !== 1 || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096) throw new Error("dimensions or format");
      // A full decode catches corrupt files; fresh JPEG encoding drops EXIF/location data.
      const normalized = await sharp(bytes, options).rotate().resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true }).flatten({ background: "white" }).jpeg({ quality: 85 }).toBuffer();
      const sourceId = `photo-${index + 1}`;
      sources.push({ id: sourceId, kind: "image", label: `Photo ${index + 1}` });
      images.push({ sourceId, mimeType: "image/jpeg", data: normalized.toString("base64") });
    } catch { throw new AnalysisError("INVALID_IMAGE"); }
  }
  return { sources, images, property: input.property ?? null };
}
