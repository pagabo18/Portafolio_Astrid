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
};

const SUPPORTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function isSupportedImage(file: File) {
  return SUPPORTED.includes(file.type) || /\.(jpe?g|png|webp|avif)$/i.test(file.name);
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
  const width = bitmap.width;
  const height = bitmap.height;
  const aspectRatio = width / height;
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
  const maxPx = opts.maxPx ?? 0;
  if (maxPx > 0 && Math.max(width, height) > maxPx) {
    const c = canvasFor(bitmap, aspectRatio >= 1 ? maxPx : Math.round(maxPx * aspectRatio));
    original = await toBlob(c, "image/jpeg", 0.92);
    ext = "jpg";
    mime = "image/jpeg";
  }
  bitmap.close();
  return { width, height, aspectRatio, orientation, dominantColor, lqip, thumb, preview, original, ext, mime };
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
