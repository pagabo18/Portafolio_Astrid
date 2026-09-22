import "server-only";
import fs from "node:fs";
import path from "node:path";
import { parseDocument, collectPhotoIds, type BlocksDocument } from "@/lib/blocks/schema";
import type { PhotoMap, PhotoView } from "@/lib/photos/view";
import type { RenderData, ProjectCard } from "@/components/editorial/types";
import { paths, withBase } from "./paths";
import { photoView } from "./photo-view";
import { defaultPage, defaultSite } from "./defaults";
import {
  categoriesFileSchema,
  pageFileSchema,
  photosFileSchema,
  projectFileSchema,
  siteSettingsSchema,
  type Category,
  type MediaManifest,
  type PageSlug,
  type PhotoRecord,
  type ProjectFile,
  type SiteSettings,
} from "./types";

/**
 * Build-time content access (static export). Everything is read from the
 * `content/` directory and `public/media/manifest.json`.
 */
const root = process.cwd();
const read = (rel: string) => {
  const f = path.join(root, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
};
const readJson = <T>(rel: string, parse: (v: unknown) => T, fallback: T): T => {
  const raw = read(rel);
  if (!raw) return fallback;
  try {
    return parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
};

export function loadSite(): SiteSettings {
  return readJson(paths.site, (v) => siteSettingsSchema.parse(v), defaultSite());
}

export function loadCategories(): Category[] {
  return readJson(paths.categories, (v) => categoriesFileSchema.parse(v).categories, []);
}

export function loadPhotoRecords(): PhotoRecord[] {
  return readJson(paths.photos, (v) => photosFileSchema.parse(v).photos, []);
}

export function loadManifest(): MediaManifest {
  return readJson("public/media/manifest.json", (v) => v as MediaManifest, {});
}

export function loadPhotos(): PhotoView[] {
  const manifest = loadManifest();
  const categories = loadCategories();
  return loadPhotoRecords()
    .filter((p) => manifest[p.id]) // only photos with generated variants make it to the site
    .map((p) => photoView(p, { manifest, categories, mediaBase: withBase("/media") }));
}

export function loadProjectFiles(): ProjectFile[] {
  const dir = path.join(root, paths.projectsDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((id) => readJson(paths.project(id), (v) => projectFileSchema.parse(v), null as ProjectFile | null))
    .filter((p): p is ProjectFile => !!p)
    .sort((a, b) => a.sortOrder - b.sortOrder || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export type PublicProject = ProjectFile & { snapshot: NonNullable<ProjectFile["published"]>; categoryName: string };

export function loadPublishedProjects(opts: { home?: boolean } = {}): PublicProject[] {
  const cats = loadCategories();
  return loadProjectFiles()
    .filter((p): p is ProjectFile & { published: NonNullable<ProjectFile["published"]> } => p.status === "published" && !!p.published)
    .filter((p) => (opts.home ? p.showOnHome : true))
    .map((p) => ({ ...p, snapshot: { ...p.published, document: parseDocument(p.published.document) }, categoryName: cats.find((c) => c.id === p.published.meta.categoryId)?.name ?? "" }));
}

export function loadPage(slug: PageSlug) {
  const file = readJson(paths.page(slug), (v) => pageFileSchema.parse(v), defaultPage(slug).file);
  return file.published ? { ...file.published, document: parseDocument(file.published.document) } : null;
}

export function toCard(p: PublicProject): ProjectCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.snapshot.meta.name,
    year: p.snapshot.meta.year,
    location: p.snapshot.meta.location,
    categoryName: p.categoryName,
    description: p.snapshot.meta.description,
    coverPhotoId: p.snapshot.meta.coverPhotoId,
    featured: p.featured,
  };
}

/** Everything a document needs to render on the public site. */
export function buildRenderData(doc: BlocksDocument): RenderData {
  const all = loadPhotos();
  const visible = all.filter((p) => !p.hidden);
  const needsProjects = doc.blocks.some((b) => b.type === "project-list");
  const needsArchive = doc.blocks.some((b) => b.type === "photo-archive");
  const projects = needsProjects ? loadPublishedProjects({ home: true }).map(toCard) : undefined;
  const ids = new Set([...collectPhotoIds(doc), ...(projects?.map((p) => p.coverPhotoId).filter((x): x is string => !!x) ?? [])]);
  const photos: PhotoMap = Object.fromEntries(visible.filter((p) => ids.has(p.id)).map((p) => [p.id, p]));
  let archivePhotos: PhotoView[] | undefined;
  let categories: RenderData["categories"];
  let years: string[] | undefined;
  if (needsArchive) {
    archivePhotos = visible.filter((p) => p.showInArchive).sort((a, b) => a.archiveOrder - b.archiveOrder);
    categories = loadCategories().filter((c) => archivePhotos!.some((p) => p.categoryId === c.id)).map((c) => ({ id: c.id, name: c.name }));
    years = [...new Set(archivePhotos.map((p) => p.year).filter(Boolean))].sort().reverse();
  }
  return { photos, projects, archivePhotos, categories, years, projectHrefBase: "/projects", interactive: true };
}
