import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Library maintenance, run from the repository:
 *
 *   npm run photos:normalize            report only
 *   npm run photos:normalize -- --apply do the work
 *
 * It drops duplicate uploads of the same file name (keeping the copy with the
 * most pixels), caps every original at a sane long edge, and repairs records
 * whose stored dimensions do not match the file on disk.
 */
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const MAX_LONG_EDGE = Number(process.env.MAX_LONG_EDGE ?? 4000);
const QUALITY = 92;
const apply = process.argv.includes("--apply");

type Photo = {
  id: string; filename: string; ext: string; mime: string; bytes: number;
  width: number; height: number; aspectRatio: number; orientation: string;
  createdAt: string; [k: string]: unknown;
};

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

async function main() {
  const file = path.join(CONTENT, "photos.json");
  const photos: Photo[] = JSON.parse(fs.readFileSync(file, "utf8")).photos;
  const dir = (id: string) => path.join(CONTENT, "photos", id);
  const originalOf = (p: Photo) => path.join(dir(p.id), `original.${p.ext}`);

  // 1. duplicates by file name: keep the largest image
  const byName = new Map<string, Photo[]>();
  for (const p of photos) byName.set(p.filename, [...(byName.get(p.filename) ?? []), p]);
  const drop = new Set<string>();
  for (const [name, list] of byName) {
    if (list.length < 2) continue;
    const measured = await Promise.all(
      list.map(async (p) => {
        const f = originalOf(p);
        const m = fs.existsSync(f) ? await sharp(f).metadata() : { width: 0, height: 0 };
        return { p, px: (m.width ?? 0) * (m.height ?? 0) };
      }),
    );
    measured.sort((a, b) => b.px - a.px);
    for (const { p } of measured.slice(1)) drop.add(p.id);
    console.log(`duplicate ${name}: keeping ${measured[0].p.id}, dropping ${measured.slice(1).map((m) => m.p.id).join(", ")}`);
  }

  const kept = photos.filter((p) => !drop.has(p.id));

  // 2. cap the long edge and repair the records
  let saved = 0;
  for (const p of kept) {
    const f = originalOf(p);
    if (!fs.existsSync(f)) {
      console.warn(`missing original for ${p.id}`);
      continue;
    }
    const before = fs.statSync(f).size;
    const meta = await sharp(f).metadata();
    const w = meta.width ?? p.width;
    const h = meta.height ?? p.height;
    const longEdge = Math.max(w, h);

    // a couple of pixels over the cap is not worth a re-encode
    if (longEdge > MAX_LONG_EDGE + 32) {
      const out = await sharp(f)
        .rotate()
        .resize({ width: w >= h ? MAX_LONG_EDGE : Math.round(MAX_LONG_EDGE * (w / h)), withoutEnlargement: true, kernel: "lanczos3" })
        .jpeg({ quality: QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
        .toBuffer({ resolveWithObject: true });
      console.log(`${p.filename}: ${w}×${h} ${mb(before)} → ${out.info.width}×${out.info.height} ${mb(out.info.size)}`);
      if (apply) {
        fs.rmSync(f, { force: true });
        fs.writeFileSync(path.join(dir(p.id), "original.jpg"), out.data);
      }
      saved += before - out.info.size;
      p.ext = "jpg";
      p.mime = "image/jpeg";
      p.bytes = out.info.size;
      p.width = out.info.width;
      p.height = out.info.height;
    } else if (p.width !== w || p.height !== h || p.bytes !== before) {
      console.log(`${p.filename}: record said ${p.width}×${p.height}, file is ${w}×${h} — repaired`);
      p.width = w;
      p.height = h;
      p.bytes = before;
    }
    p.aspectRatio = p.width / p.height;
    p.orientation = Math.abs(p.aspectRatio - 1) < 0.02 ? "square" : p.aspectRatio > 1 ? "landscape" : "portrait";
  }

  console.log(`\n${photos.length} photos → ${kept.length} kept, ${drop.size} duplicates removed, ${mb(saved)} saved`);
  if (!apply) {
    console.log("dry run — pass --apply to write the changes");
    return;
  }
  for (const id of drop) fs.rmSync(dir(id), { recursive: true, force: true });
  fs.writeFileSync(file, JSON.stringify({ photos: kept }, null, 2) + "\n");
  console.log("photos.json updated");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
