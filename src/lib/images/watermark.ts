import type { Sharp } from "sharp";

/**
 * Watermark compositing, shared by the build. It runs on the generated web
 * variants only, so the file kept in the repository is never altered and the
 * mark can be changed or lifted at any time.
 */
export type WatermarkConfig = {
  enabled: boolean;
  mode: "text" | "image";
  text: string;
  family: "sans" | "serif" | "mono";
  position:
    | "top-left" | "top-center" | "top-right"
    | "center-left" | "center" | "center-right"
    | "bottom-left" | "bottom-center" | "bottom-right";
  size: number;
  opacity: number;
  color: string;
  margin: number;
  minWidth: number;
};

const FAMILY: Record<WatermarkConfig["family"], string> = {
  sans: "DejaVu Sans, Helvetica, Arial, sans-serif",
  serif: "DejaVu Serif, Georgia, serif",
  mono: "DejaVu Sans Mono, monospace",
};

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function parts(position: WatermarkConfig["position"]) {
  const [v, h] = position.split("-") as ["top" | "center" | "bottom", "left" | "center" | "right" | undefined];
  return { v, h: h ?? "center" };
}

/** A full-size SVG layer with the text placed where the settings ask. */
export function textLayer(cfg: WatermarkConfig, width: number, height: number): Buffer {
  const { v, h } = parts(cfg.position);
  const fontSize = Math.max(8, Math.round((width * cfg.size) / 100));
  const margin = Math.round((width * cfg.margin) / 100);
  const x = h === "left" ? margin : h === "right" ? width - margin : width / 2;
  const anchor = h === "left" ? "start" : h === "right" ? "end" : "middle";
  const y = v === "top" ? margin + fontSize * 0.85 : v === "bottom" ? height - margin : height / 2 + fontSize * 0.35;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FAMILY[cfg.family]}" font-size="${fontSize}"
        fill="${cfg.color}" fill-opacity="${cfg.opacity}" letter-spacing="${(fontSize * 0.04).toFixed(2)}">${escapeXml(cfg.text)}</text>
</svg>`;
  return Buffer.from(svg);
}

/** Where a logo of this size sits on an image of that size. */
export function logoPlacement(cfg: WatermarkConfig, width: number, height: number, logoW: number, logoH: number) {
  const { v, h } = parts(cfg.position);
  const margin = Math.round((width * cfg.margin) / 100);
  const left = h === "left" ? margin : h === "right" ? Math.max(0, width - margin - logoW) : Math.round((width - logoW) / 2);
  const top = v === "top" ? margin : v === "bottom" ? Math.max(0, height - margin - logoH) : Math.round((height - logoH) / 2);
  return { left: Math.max(0, left), top: Math.max(0, top) };
}

export function shouldMark(cfg: WatermarkConfig, variantWidth: number, photoOptedOut: boolean) {
  if (!cfg.enabled || photoOptedOut) return false;
  if (cfg.mode === "text" && !cfg.text.trim()) return false;
  return variantWidth >= (cfg.minWidth || 0);
}

/**
 * Apply the mark to one already-resized variant. `logo` is the PNG bytes when
 * the mark is an image; it is resized to the configured share of the width.
 */
export async function applyWatermark(
  sharpFn: (input: Buffer) => Sharp,
  image: Buffer,
  cfg: WatermarkConfig,
  width: number,
  height: number,
  logo: Buffer | null,
): Promise<Buffer> {
  if (cfg.mode === "text") {
    return sharpFn(image).composite([{ input: textLayer(cfg, width, height), top: 0, left: 0 }]).toBuffer();
  }
  if (!logo) return image;
  const targetW = Math.max(16, Math.round((width * cfg.size) / 100));
  const resized = await sharpFn(logo)
    .resize({ width: targetW, withoutEnlargement: false })
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(cfg.opacity * 255)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
    .png()
    .toBuffer({ resolveWithObject: true });
  const { left, top } = logoPlacement(cfg, width, height, resized.info.width, resized.info.height);
  return sharpFn(image).composite([{ input: resized.data, left, top }]).toBuffer();
}
