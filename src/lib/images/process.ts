import "server-only";
import sharp from "sharp";
import type { PhotoVariant } from "@/lib/db/schema";

/**
 * Image pipeline. The original is stored untouched; we derive:
 *   - responsive variants (AVIF + WebP) at several widths, never upscaled
 *   - a small thumbnail (WebP) for the admin
 *   - an LQIP (tiny blurred base64) for progressive loading
 *   - dimensions, aspect ratio, orientation, dominant colour, EXIF basics
 *
 * Quality settings are deliberately conservative for a photography
 * portfolio: grain, gradients and shadows must survive.
 */

export const VARIANT_WIDTHS = [480, 768, 1200, 1600, 2400] as const;
const AVIF_QUALITY = 68;
const WEBP_QUALITY = 88;
const JPEG_QUALITY = 90;

export type ProcessedImage = {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "landscape" | "portrait" | "square";
  dominantColor: string;
  lqip: string;
  exif: Record<string, unknown>;
  files: { key: string; data: Buffer; contentType: string }[];
  variants: PhotoVariant[];
  thumbKey: string;
  originalKey: string;
  mime: string;
};

const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  tiff: "image/tiff",
  heif: "image/heic",
  gif: "image/gif",
};

function extFor(format: string) {
  if (format === "jpeg") return "jpg";
  if (format === "heif") return "heic";
  return format;
}

function toHex(n: number) {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
}

export async function processImage(input: Buffer, photoId: string): Promise<ProcessedImage> {
  const base = sharp(input, { failOn: "none", limitInputPixels: 400e6 }).rotate(); // honour EXIF orientation
  const meta = await base.metadata();
  const format = meta.format ?? "jpeg";
  const mime = MIME_BY_FORMAT[format] ?? "application/octet-stream";

  // after .rotate() width/height may swap
  const rotated = await base.clone().toBuffer({ resolveWithObject: true });
  const width = rotated.info.width;
  const height = rotated.info.height;
  const aspectRatio = width / height;
  const orientation = Math.abs(aspectRatio - 1) < 0.02 ? "square" : aspectRatio > 1 ? "landscape" : "portrait";

  const stats = await sharp(rotated.data).stats();
  const dom = stats.dominant;
  const dominantColor = `#${toHex(dom.r)}${toHex(dom.g)}${toHex(dom.b)}`;

  const lqipBuf = await sharp(rotated.data).resize(24, 24, { fit: "inside" }).blur(1).webp({ quality: 40 }).toBuffer();
  const lqip = `data:image/webp;base64,${lqipBuf.toString("base64")}`;

  const exif: Record<string, unknown> = {};
  if (meta.density) exif.density = meta.density;
  if (meta.space) exif.colorSpace = meta.space;
  if (meta.hasAlpha) exif.hasAlpha = true;

  const originalKey = `photos/${photoId}/original.${extFor(format)}`;
  const files: ProcessedImage["files"] = [{ key: originalKey, data: input, contentType: mime }];
  const variants: PhotoVariant[] = [];

  const widths: number[] = VARIANT_WIDTHS.filter((w) => w < width);
  // always include the native size (capped at 2400 for very large originals) as the largest variant
  const largest = Math.min(width, 2400);
  if (!widths.includes(largest)) widths.push(largest);

  for (const w of widths) {
    const pipeline = sharp(rotated.data).resize({ width: w, withoutEnlargement: true, kernel: "lanczos3" });
    const [avif, webp] = await Promise.all([
      pipeline.clone().avif({ quality: AVIF_QUALITY, effort: 4, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true }),
      pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true }).toBuffer({ resolveWithObject: true }),
    ]);
    const avifKey = `photos/${photoId}/w${w}.avif`;
    const webpKey = `photos/${photoId}/w${w}.webp`;
    files.push({ key: avifKey, data: avif.data, contentType: "image/avif" });
    files.push({ key: webpKey, data: webp.data, contentType: "image/webp" });
    variants.push({ width: avif.info.width, height: avif.info.height, format: "avif", path: avifKey, bytes: avif.info.size });
    variants.push({ width: webp.info.width, height: webp.info.height, format: "webp", path: webpKey, bytes: webp.info.size });
  }
  // A JPEG fallback at 1600 for very old browsers / OG images.
  const jpegW = Math.min(width, 1600);
  const jpeg = await sharp(rotated.data)
    .resize({ width: jpegW, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer({ resolveWithObject: true });
  const jpegKey = `photos/${photoId}/w${jpegW}.jpg`;
  files.push({ key: jpegKey, data: jpeg.data, contentType: "image/jpeg" });
  variants.push({ width: jpeg.info.width, height: jpeg.info.height, format: "jpeg", path: jpegKey, bytes: jpeg.info.size });

  const thumb = await sharp(rotated.data).resize({ width: 400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const thumbKey = `photos/${photoId}/thumb.webp`;
  files.push({ key: thumbKey, data: thumb, contentType: "image/webp" });

  return { width, height, aspectRatio, orientation, dominantColor, lqip, exif, files, variants, thumbKey, originalKey, mime };
}
