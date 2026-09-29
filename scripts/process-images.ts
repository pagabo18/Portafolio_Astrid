import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { applyWatermark, shouldMark, type WatermarkConfig } from "../src/lib/images/watermark";

/**
 * Generates the responsive variants for every photograph in content/photos.json
 * and assembles public/media/ (git-ignored) for the static build:
 *
 *   public/media/photos/<id>/w480.avif … w2400.webp, w1600.jpg  (generated)
 *   public/media/photos/<id>/thumb.webp, preview.webp, original.<ext>  (copied)
 *   public/media/manifest.json
 *
 * Work is cached in .cache/media keyed by photo id + content hash, so a
 * deploy only processes new or replaced photographs (the GitHub Actions
 * workflow restores/saves that cache).
 */
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const CACHE = path.join(ROOT, ".cache", "media");
const OUT = path.join(ROOT, "public", "media");

const WIDTHS = [480, 768, 1200, 1600, 2400];
const AVIF_QUALITY = 68;
const WEBP_QUALITY = 88;
const JPEG_QUALITY = 90;

type Variant = { width: number; height: number; format: "avif" | "webp" | "jpeg"; file: string; bytes: number };
type Photo = { id: string; ext: string; width: number; noWatermark?: boolean };

async function generate(src: Buffer, dir: string, wm: { cfg: WatermarkConfig; logo: Buffer | null; optedOut: boolean } | null): Promise<Variant[]> {
  fs.mkdirSync(dir, { recursive: true });
  const base = sharp(src, { failOn: "none", limitInputPixels: 400e6 }).rotate();
  const rotated = await base.toBuffer({ resolveWithObject: true });
  const width = rotated.info.width;
  const widths = WIDTHS.filter((w) => w < width);
  const largest = Math.min(width, 2400);
  if (!widths.includes(largest)) widths.push(largest);
  const variants: Variant[] = [];
  for (const w of widths) {
    // resize first, then stamp, so the mark keeps the same relative size
    let base = await sharp(rotated.data).resize({ width: w, withoutEnlargement: true, kernel: "lanczos3" }).toBuffer({ resolveWithObject: true });
    if (wm && shouldMark(wm.cfg, base.info.width, wm.optedOut)) {
      const marked = await applyWatermark((b) => sharp(b), base.data, wm.cfg, base.info.width, base.info.height, wm.logo);
      base = { data: marked as Buffer<ArrayBuffer>, info: base.info };
    }
    const p = sharp(base.data);
    const [avif, webp] = await Promise.all([
      p.clone().avif({ quality: AVIF_QUALITY, effort: 4, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true }),
      p.clone().webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true }).toBuffer({ resolveWithObject: true }),
    ]);
    fs.writeFileSync(path.join(dir, `w${w}.avif`), avif.data);
    fs.writeFileSync(path.join(dir, `w${w}.webp`), webp.data);
    variants.push({ width: avif.info.width, height: avif.info.height, format: "avif", file: `w${w}.avif`, bytes: avif.info.size });
    variants.push({ width: webp.info.width, height: webp.info.height, format: "webp", file: `w${w}.webp`, bytes: webp.info.size });
  }
  const jw = Math.min(width, 1600);
  let jbase = await sharp(rotated.data).resize({ width: jw, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  if (wm && shouldMark(wm.cfg, jbase.info.width, wm.optedOut)) {
    jbase = { data: (await applyWatermark((b) => sharp(b), jbase.data, wm.cfg, jbase.info.width, jbase.info.height, wm.logo)) as Buffer<ArrayBuffer>, info: jbase.info };
  }
  const jpeg = await sharp(jbase.data).jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(dir, `w${jw}.jpg`), jpeg.data);
  variants.push({ width: jpeg.info.width, height: jpeg.info.height, format: "jpeg", file: `w${jw}.jpg`, bytes: jpeg.info.size });
  // thumb + preview are normally uploaded by the browser; make sure they exist
  if (!fs.existsSync(path.join(dir, "thumb.webp"))) fs.writeFileSync(path.join(dir, "thumb.webp"), await sharp(rotated.data).resize({ width: 400 }).webp({ quality: 82 }).toBuffer());
  if (!fs.existsSync(path.join(dir, "preview.webp"))) fs.writeFileSync(path.join(dir, "preview.webp"), await sharp(rotated.data).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer());
  fs.writeFileSync(path.join(dir, "variants.json"), JSON.stringify(variants));
  return variants;
}

function copyDir(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
}

async function main() {
  const photosFile = path.join(CONTENT, "photos.json");
  const photos: Photo[] = fs.existsSync(photosFile) ? JSON.parse(fs.readFileSync(photosFile, "utf8")).photos : [];

  // watermark settings travel with the cache key, so changing them re-renders
  const siteFile = path.join(CONTENT, "site.json");
  const site = fs.existsSync(siteFile) ? JSON.parse(fs.readFileSync(siteFile, "utf8")) : {};
  const cfg: WatermarkConfig | null = site.watermark?.enabled ? (site.watermark as WatermarkConfig) : null;
  const logoPath = path.join(CONTENT, "watermark.png");
  const logo = cfg?.mode === "image" && fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;
  const wmKey = cfg ? createHash("sha1").update(JSON.stringify(cfg) + (logo ? createHash("sha1").update(logo).digest("hex") : "")).digest("hex").slice(0, 8) : "nw";
  if (cfg) console.log(`watermark: ${cfg.mode}${cfg.mode === "text" ? ` “${cfg.text}”` : logo ? " (logo)" : " (logo missing — skipped)"} at ${cfg.position}`);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "photos"), { recursive: true });
  const manifest: Record<string, { sha: string; variants: Variant[] }> = {};
  const keep = new Set<string>();
  let generated = 0;

  for (const p of photos) {
    const srcDir = path.join(CONTENT, "photos", p.id);
    const original = path.join(srcDir, `original.${p.ext}`);
    if (!fs.existsSync(original)) {
      console.warn(`skip ${p.id}: missing original`);
      continue;
    }
    const buf = fs.readFileSync(original);
    const sha = createHash("sha1").update(buf).digest("hex").slice(0, 16);
    const key = `${p.id}-${sha}-${p.noWatermark ? "nw" : wmKey}`;
    keep.add(key);
    const cacheDir = path.join(CACHE, key);
    let variants: Variant[];
    if (fs.existsSync(path.join(cacheDir, "variants.json"))) {
      variants = JSON.parse(fs.readFileSync(path.join(cacheDir, "variants.json"), "utf8"));
    } else {
      // copy browser-made thumb/preview first so generate() keeps them
      fs.mkdirSync(cacheDir, { recursive: true });
      for (const f of ["thumb.webp", "preview.webp"]) if (fs.existsSync(path.join(srcDir, f))) fs.copyFileSync(path.join(srcDir, f), path.join(cacheDir, f));
      process.stdout.write(`processing ${p.id} …`);
      const t = Date.now();
      variants = await generate(buf, cacheDir, cfg ? { cfg, logo, optedOut: !!p.noWatermark } : null);
      console.log(` ${((Date.now() - t) / 1000).toFixed(1)}s`);
      generated++;
    }
    const outDir = path.join(OUT, "photos", p.id);
    copyDir(cacheDir, outDir);
    fs.rmSync(path.join(outDir, "variants.json"), { force: true });
    // the browser's thumb/preview win if newer than the cached ones
    for (const f of ["thumb.webp", "preview.webp"]) if (fs.existsSync(path.join(srcDir, f))) fs.copyFileSync(path.join(srcDir, f), path.join(outDir, f));
    // the unmarked original is deliberately not published
    if (!cfg) fs.copyFileSync(original, path.join(outDir, `original.${p.ext}`));
    manifest[p.id] = { sha, variants };
  }
  // prune cache entries for deleted / replaced photos
  for (const d of fs.readdirSync(CACHE)) if (!keep.has(d)) fs.rmSync(path.join(CACHE, d), { recursive: true, force: true });
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest));
  console.log(`media ready: ${Object.keys(manifest).length} photos (${generated} newly processed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
