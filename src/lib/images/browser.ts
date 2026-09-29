/**
 * Client-side image analysis and derivatives. Runs in the admin's browser so
 * that a photograph is usable immediately after upload (dimensions, aspect
 * ratio, orientation, LQIP, dominant colour, thumbnail, 1600px preview).
 * The responsive AVIF/WebP variants are produced later by the build.
 */
export type BrowserProcessed = {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "landscape" | "portrait" | "square";
  dominantColor: string;
  lqip: string;
  thumb: Blob;
  preview: Blob;
  /** Possibly downscaled original (JPEG) when a max size is configured. */
  original: Blob;
  ext: string;
  mime: string;
  /** True when the file had to be re-encoded to fit the upload limit. */
  downscaled: boolean;
};

const SUPPORTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Upper bound for what we send to GitHub. Its blob API rejects large bodies
 * ("your input was too large to process") and base64 inflates a file by a
 * third, so anything heavier is re-encoded until it fits. 2400 px is the
 * widest variant the site ever serves, so this loses nothing visible.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const FALLBACK_STEPS: { longEdge: number; quality: number }[] = [
  { longEdge: 4000, quality: 0.92 },
  { longEdge: 3600, quality: 0.9 },
  { longEdge: 3200, quality: 0.88 },
  { longEdge: 2800, quality: 0.86 },
  { longEdge: 2400, quality: 0.84 },
  { longEdge: 2000, quality: 0.82 },
];

export function isSupportedImage(file: File) {
  return SUPPORTED.includes(file.type) || /\.(jpe?g|png|webp|avif)$/i.test(file.name);
}

/** Render the bitmap with its long edge capped at `longEdge`. */
function canvasForLongEdge(bitmap: ImageBitmap, longEdge: number) {
  const maxW = bitmap.width >= bitmap.height ? longEdge : Math.round(longEdge * (bitmap.width / bitmap.height));
  return canvasFor(bitmap, maxW);
}

function canvasFor(bitmap: ImageBitmap, maxW: number) {
  const scale = Math.min(1, maxW / bitmap.width);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = c.getContext("2d", { alpha: false })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  return c;
}

function toBlob(c: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality));
}

function toHex(n: number) {
  return Math.round(n).toString(16).padStart(2, "0");
}

export async function processInBrowser(file: File, opts: { maxPx?: number } = {}): Promise<BrowserProcessed> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let width = bitmap.width;
  let height = bitmap.height;
  const aspectRatio = bitmap.width / bitmap.height;
  const orientation = Math.abs(aspectRatio - 1) < 0.02 ? "square" : aspectRatio > 1 ? "landscape" : "portrait";

  const thumbC = canvasFor(bitmap, 400);
  const previewC = canvasFor(bitmap, 1600);
  const tinyC = canvasFor(bitmap, 24);
  const [thumb, preview, lqipBlob] = await Promise.all([toBlob(thumbC, "image/webp", 0.82), toBlob(previewC, "image/webp", 0.85), toBlob(tinyC, "image/webp", 0.4)]);
  const lqip = await blobToDataUrl(lqipBlob);

  const px = tinyC.getContext("2d")!.getImageData(0, 0, tinyC.width, tinyC.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < px.length; i += 4) {
    r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
  }
  const dominantColor = `#${toHex(r / n)}${toHex(g / n)}${toHex(b / n)}`;

  let original: Blob = file;
  let ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace("jpeg", "jpg");
  let mime = file.type || "image/jpeg";
  let downscaled = false;
  const longEdge = Math.max(width, height);
  const maxPx = opts.maxPx ?? 0;

  // Re-encode when the photographer asked for it, or when the file is simply
  // too heavy to reach GitHub in one piece.
  const steps = maxPx > 0 ? [{ longEdge: maxPx, quality: 0.92 }, ...FALLBACK_STEPS.filter((s) => s.longEdge < maxPx)] : FALLBACK_STEPS;
  const needsShrink = (maxPx > 0 && longEdge > maxPx) || file.size > MAX_UPLOAD_BYTES;
  if (needsShrink) {
    for (const step of steps) {
      const c = canvasForLongEdge(bitmap, Math.min(step.longEdge, longEdge));
      const blob = await toBlob(c, "image/jpeg", step.quality);
      original = blob;
      downscaled = true;
      ext = "jpg";
      mime = "image/jpeg";
      // the record must describe the file we keep, not the camera file
      width = c.width;
      height = c.height;
      if (blob.size <= MAX_UPLOAD_BYTES) break;
    }
  }
  bitmap.close();
  return { width, height, aspectRatio, orientation, dominantColor, lqip, thumb, preview, original, ext, mime, downscaled };
}

export function blobToDataUrl(b: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(b);
  });
}

export async function blobToBase64(b: Blob) {
  const url = await blobToDataUrl(b);
  return url.slice(url.indexOf(",") + 1);
}
