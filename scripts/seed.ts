import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { autoCompose } from "../src/lib/blocks/templates";
import type { PhotoRecord } from "../src/lib/content/types";

/**
 * Demo content for local development: synthetic monochrome "photographs"
 * with different aspect ratios, two projects (one published) and the three
 * pages. Writes into ./content — run `npm run dev` afterwards.
 * Delete content/photos/* and the demo projects when you start for real.
 */
const ROOT = process.cwd();
const C = path.join(ROOT, "content");
const now = new Date().toISOString();
const write = (rel: string, data: unknown) => {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof data === "string" || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + "\n");
};

async function synth(w: number, h: number, seed: number, name: string) {
  const rnd = (i: number) => { const x = Math.sin(seed * 999 + i * 7.31) * 43758.5453; return x - Math.floor(x); };
  const st = [Math.round(20 + rnd(1) * 60), Math.round(120 + rnd(2) * 100), Math.round(30 + rnd(3) * 80)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>
    <linearGradient id="g" gradientTransform="rotate(${Math.round(rnd(4) * 360)})"><stop offset="0" stop-color="rgb(${st[0]},${st[0]},${st[0]})"/><stop offset="0.55" stop-color="rgb(${st[1]},${st[1]},${st[1]})"/><stop offset="1" stop-color="rgb(${st[2]},${st[2]},${st[2]})"/></linearGradient>
    <radialGradient id="r" cx="${0.3 + rnd(5) * 0.4}" cy="${0.3 + rnd(6) * 0.4}" r="0.6"><stop offset="0" stop-color="white" stop-opacity="0.35"/><stop offset="1" stop-color="black" stop-opacity="0.25"/></radialGradient>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer></filter></defs>
    <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>
    <rect x="${w * (0.1 + rnd(7) * 0.5)}" y="${h * (0.2 + rnd(8) * 0.4)}" width="${w * (0.08 + rnd(9) * 0.25)}" height="${h * (0.3 + rnd(10) * 0.5)}" fill="rgb(${st[2] - 15},${st[2] - 15},${st[2] - 15})" opacity="0.7"/>
    <rect width="100%" height="100%" filter="url(#n)"/>
    <text x="${w - 24}" y="${h - 16}" font-family="Helvetica, Arial" font-size="${Math.round(w / 60)}" fill="white" fill-opacity="0.5" text-anchor="end">${name}</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function main() {
  const cats = [
    { id: "cat_landscape", name: "Landscape", slug: "landscape", sortOrder: 0 },
    { id: "cat_automotive", name: "Automotive", slug: "automotive", sortOrder: 1 },
    { id: "cat_portrait", name: "Portrait", slug: "portrait", sortOrder: 2 },
  ];
  const specs: [number, number, string, string, string, string][] = [
    [3000, 2000, "Morning road", "Sevan, Armenia", "cat_landscape", "2021"],
    [2000, 3000, "Cliffs I", "Sevan, Armenia", "cat_landscape", "2021"],
    [2000, 2500, "Cliffs II", "Sevan, Armenia", "cat_landscape", "2021"],
    [3600, 1500, "Lake, wide", "Sevan, Armenia", "cat_landscape", "2021"],
    [2000, 3000, "Grille", "Guadalajara, Mexico", "cat_automotive", "2026"],
    [3000, 2000, "Gear knob", "Guadalajara, Mexico", "cat_automotive", "2026"],
    [2400, 2400, "Wheel", "Guadalajara, Mexico", "cat_automotive", "2026"],
    [2000, 2600, "Monk", "Hayravank", "cat_portrait", "2021"],
    [3000, 2000, "Cow", "Sevan, Armenia", "cat_landscape", "2021"],
    [2000, 3000, "Monastery wall", "Hayravank", "cat_landscape", "2021"],
    [3000, 2000, "Seagull island", "Sevan, Armenia", "cat_landscape", "2021"],
    [2000, 3000, "Headlights", "Guadalajara, Mexico", "cat_automotive", "2026"],
  ];
  const photos: PhotoRecord[] = [];
  for (let i = 0; i < specs.length; i++) {
    const [w, h, title, location, categoryId, year] = specs[i];
    const id = `ph_demo${String(i + 1).padStart(2, "0")}`;
    const buf = await synth(w, h, i + 1, title);
    const dir = `content/photos/${id}`;
    write(`${dir}/original.jpg`, buf);
    write(`${dir}/thumb.webp`, await sharp(buf).resize({ width: 400 }).webp({ quality: 82 }).toBuffer());
    write(`${dir}/preview.webp`, await sharp(buf).resize({ width: 1600 }).webp({ quality: 85 }).toBuffer());
    const lqip = `data:image/webp;base64,${(await sharp(buf).resize(24, 24, { fit: "inside" }).blur(1).webp({ quality: 40 }).toBuffer()).toString("base64")}`;
    const { dominant } = await sharp(buf).stats();
    const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    photos.push({
      id, filename: `demo-${String(i + 1).padStart(2, "0")}.jpg`, ext: "jpg", mime: "image/jpeg", bytes: buf.length, width: w, height: h, aspectRatio: w / h,
      orientation: w === h ? "square" : w > h ? "landscape" : "portrait", dominantColor: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`, lqip, originalSha: "",
      title, description: "", alt: `${title}, ${location}`, altSuggested: false, year, location, camera: "", lens: "", categoryId, projectId: null,
      hidden: false, featured: false, showOnHome: false, showInArchive: true, archiveOrder: i, focalX: 0.5, focalY: 0.5, createdAt: now, updatedAt: now,
    });
    console.log(`photo ${i + 1}/${specs.length} ${title}`);
  }
  const ids = photos.map((p) => p.id);
  const compose = (list: string[]) => ({ version: 1, blocks: autoCompose(list.map((id) => { const p = photos.find((x) => x.id === id)!; return { id, aspectRatio: p.aspectRatio, orientation: p.orientation, dominantColor: p.dominantColor }; })) });
  const projects = [
    { id: "prj_sevan", slug: "sevan-on-film", name: "Sevan on film", year: "2021", location: "Lake Sevan, Armenia", description: "Zine n.1 — a road, an island, cliffs and a monastery. Shot on expired 35mm film over three days in late autumn.", categoryId: "cat_landscape", photoIds: [ids[0], ids[1], ids[2], ids[3], ids[7], ids[8], ids[9], ids[10]], published: true },
    { id: "prj_enduro", slug: "enduro-2026", name: "Enduro 2026", year: "2026", location: "Guadalajara, Mexico", description: "Details of a machine at rest.", categoryId: "cat_automotive", photoIds: [ids[4], ids[5], ids[6], ids[11]], published: true },
  ];
  projects.forEach((p, i) => {
    const meta = { name: p.name, slug: p.slug, year: p.year, location: p.location, description: p.description, coverPhotoId: p.photoIds[0], categoryId: p.categoryId, seoTitle: "", seoDescription: "", ogPhotoId: null };
    const document = compose(p.photoIds);
    for (const ph of photos) if (p.photoIds.includes(ph.id)) ph.projectId = p.id;
    write(`content/projects/${p.id}/project.json`, { id: p.id, slug: p.slug, status: p.published ? "published" : "draft", sortOrder: i, featured: i === 0, showOnHome: true, showInArchive: true, photoIds: p.photoIds, published: p.published ? { meta, document, publishedAt: now } : null, publishedAt: p.published ? now : null, createdAt: now, updatedAt: now });
    write(`content/projects/${p.id}/draft.json`, { meta, document, draftUpdatedAt: now });
  });
  write("content/photos.json", { photos });
  write("content/categories.json", { categories: cats });
  if (!fs.existsSync(path.join(C, "site.json"))) write("content/site.json", { siteName: "Studio", tagline: "Photography", authorName: "Your name" });
  console.log("Demo content written to ./content — run `npm run dev`.");
}
main().catch((e) => { console.error(e); process.exit(1); });
