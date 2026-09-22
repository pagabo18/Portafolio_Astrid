import "server-only";
import type { BlocksDocument } from "@/lib/blocks/schema";
import type { RenderData, ProjectCard } from "@/components/editorial/types";
import { listPublishedProjects, photosForDocument, type PublicProject } from "./projects";
import { listCategories, listPhotos, photoYears } from "./photos";
import { getPhotoMap } from "./photos";

/**
 * Assemble everything a document needs to render: referenced photos plus
 * page-level datasets (project list for the home, archive photos…).
 */
export async function buildRenderData(
  doc: BlocksDocument,
  opts: { includeHidden?: boolean; projectHrefBase?: string; interactive?: boolean } = {},
): Promise<RenderData> {
  const needsProjects = doc.blocks.some((b) => b.type === "project-list");
  const needsArchive = doc.blocks.some((b) => b.type === "photo-archive");

  let projects: ProjectCard[] | undefined;
  let extraIds: string[] = [];
  if (needsProjects) {
    const list = await listPublishedProjects({ home: true });
    projects = list.map((p) => toCard(p));
    extraIds = projects.map((p) => p.coverPhotoId).filter((x): x is string => !!x);
  }
  const photos = await photosForDocument(doc, extraIds, { includeHidden: opts.includeHidden });

  let archivePhotos: RenderData["archivePhotos"];
  let categories: RenderData["categories"];
  let years: RenderData["years"];
  if (needsArchive) {
    const all = await listPhotos({ hidden: "visible", sort: "archive" });
    archivePhotos = all.filter((p) => p.showInArchive);
    categories = (await listCategories()).map((c) => ({ id: c.id, name: c.name })).filter((c) => archivePhotos!.some((p) => p.categoryId === c.id));
    years = (await photoYears()).filter((y) => archivePhotos!.some((p) => p.year === y));
  }
  const base = opts.projectHrefBase ?? "/projects";
  return { photos, projects, archivePhotos, categories, years, projectHrefBase: base, interactive: opts.interactive ?? true };
}

export function toCard(p: PublicProject): ProjectCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.meta.name,
    year: p.meta.year,
    location: p.meta.location,
    categoryName: p.categoryName,
    description: p.meta.description,
    coverPhotoId: p.meta.coverPhotoId,
    featured: p.featured,
  };
}

export { getPhotoMap };
