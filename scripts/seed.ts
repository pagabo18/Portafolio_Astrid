import "./_env";
import sharp from "sharp";
import { createPhotoFromUpload, createCategory, updatePhoto } from "../src/lib/data/photos";
import { createProject, publishProject } from "../src/lib/data/projects";
import { ensurePages } from "../src/lib/data/pages";
import { bootstrapAdminFromEnv, userCount } from "../src/lib/data/users";
import { saveSiteSettings } from "../src/lib/data/settings";

/**
 * Demo content so the editorial layouts can be seen immediately. Generates a
 * few synthetic monochrome "photographs" (gradients + grain) with different
 * aspect ratios, creates a project with an automatic composition and
 * publishes it. Safe to run once; delete the demo project afterwards.
 */
async function synth(w: number, h: number, seed: number, name: string) {
  const rnd = (i: number) => {
    const x = Math.sin(seed * 999 + i * 7.31) * 43758.5453;
    return x - Math.floor(x);
  };
  const stops = [Math.round(20 + rnd(1) * 60), Math.round(120 + rnd(2) * 100), Math.round(30 + rnd(3) * 80)];
  const angle = Math.round(rnd(4) * 360);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" gradientTransform="rotate(${angle})">
        <stop offset="0" stop-color="rgb(${stops[0]},${stops[0]},${stops[0]})"/>
        <stop offset="0.55" stop-color="rgb(${stops[1]},${stops[1]},${stops[1]})"/>
        <stop offset="1" stop-color="rgb(${stops[2]},${stops[2]},${stops[2]})"/>
      </linearGradient>
      <radialGradient id="r" cx="${0.3 + rnd(5) * 0.4}" cy="${0.3 + rnd(6) * 0.4}" r="0.6">
        <stop offset="0" stop-color="white" stop-opacity="0.35"/><stop offset="1" stop-color="black" stop-opacity="0.25"/>
      </radialGradient>
      <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer></filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#r)"/>
    <rect x="${w * (0.1 + rnd(7) * 0.5)}" y="${h * (0.2 + rnd(8) * 0.4)}" width="${w * (0.08 + rnd(9) * 0.25)}" height="${h * (0.3 + rnd(10) * 0.5)}" fill="rgb(${stops[2] - 15},${stops[2] - 15},${stops[2] - 15})" opacity="0.7"/>
    <rect width="100%" height="100%" filter="url(#n)"/>
    <text x="${w - 24}" y="${h - 16}" font-family="Helvetica, Arial" font-size="${Math.round(w / 60)}" fill="white" fill-opacity="0.5" text-anchor="end">${name}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

async function main() {
  await ensurePages();
  const admin = await bootstrapAdminFromEnv();
  if (admin) console.log(`Admin created from env: ${admin.email}`);
  else if ((await userCount()) === 0) console.log("No admin yet: set ADMIN_EMAIL/ADMIN_PASSWORD or run `npm run admin:create`.");

  await saveSiteSettings({ siteName: "Studio", tagline: "Photography", authorName: "Your name" });
  const landscape = await createCategory("Landscape", "landscape");
  const automotive = await createCategory("Automotive", "automotive");
  const portrait = await createCategory("Portrait", "portrait");

  const specs: [number, number, string, string, string][] = [
    [3000, 2000, "Morning road", "Sevan, Armenia", landscape.id],
    [2000, 3000, "Cliffs I", "Sevan, Armenia", landscape.id],
    [2000, 2500, "Cliffs II", "Sevan, Armenia", landscape.id],
    [3600, 1500, "Lake, wide", "Sevan, Armenia", landscape.id],
    [2000, 3000, "Grille", "Guadalajara, Mexico", automotive.id],
    [3000, 2000, "Gear knob", "Guadalajara, Mexico", automotive.id],
    [2400, 2400, "Wheel", "Guadalajara, Mexico", automotive.id],
    [2000, 2600, "Monk", "Hayravank", portrait.id],
    [3000, 2000, "Cow", "Sevan, Armenia", landscape.id],
    [2000, 3000, "Monastery wall", "Hayravank", landscape.id],
    [3000, 2000, "Seagull island", "Sevan, Armenia", landscape.id],
    [2000, 3000, "Headlights", "Guadalajara, Mexico", automotive.id],
  ];
  const ids: string[] = [];
  for (let i = 0; i < specs.length; i++) {
    const [w, h, title, location, categoryId] = specs[i];
    const data = await synth(w, h, i + 1, title);
    const p = await createPhotoFromUpload({ name: `demo-${String(i + 1).padStart(2, "0")}.jpg`, data }, { categoryId });
    await updatePhoto(p.id, { title, location, year: i < 4 || i === 8 || i === 9 || i === 10 ? "2021" : "2026", alt: `${title}, ${location}`, showInArchive: true, archiveOrder: i });
    ids.push(p.id);
    console.log(`photo ${i + 1}/${specs.length} ${title}`);
  }
  const sevan = await createProject({ name: "Sevan on film", year: "2021", location: "Lake Sevan, Armenia", description: "Zine n.1 — a road, an island, cliffs and a monastery. Shot on expired 35mm film over three days in late autumn.", categoryId: landscape.id, photoIds: [ids[0], ids[1], ids[2], ids[3], ids[7], ids[8], ids[9], ids[10]] });
  await publishProject(sevan.id);
  const enduro = await createProject({ name: "Enduro 2026", year: "2026", location: "Guadalajara, Mexico", description: "Details of a machine at rest.", categoryId: automotive.id, photoIds: [ids[4], ids[5], ids[6], ids[11]] });
  await publishProject(enduro.id);
  console.log("Demo projects created and published: /projects/sevan-on-film, /projects/enduro-2026");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
