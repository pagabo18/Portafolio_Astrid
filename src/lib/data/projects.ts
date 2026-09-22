import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { id as newId, slugify, token } from "@/lib/ids";
import { parseDocument, type BlocksDocument, collectPhotoIds, newId as blockId } from "@/lib/blocks/schema";
import { autoCompose } from "@/lib/blocks/templates";
import type { Project, ProjectMeta, Version } from "@/lib/db/schema";
import { getPhotoMap, listPhotos } from "./photos";

export type ProjectListItem = Project & { photoCount: number; hasUnpublished: boolean };

export function hasUnpublishedChanges(p: { draftUpdatedAt: Date; publishedAt: Date | null; status: string }) {
  if (!p.publishedAt) return p.status === "published" ? true : true;
  return p.draftUpdatedAt.getTime() > p.publishedAt.getTime() + 1000;
}

export async function listProjectsAdmin(): Promise<ProjectListItem[]> {
  const db = await getDb();
  const rows = await db.select().from(schema.projects).orderBy(asc(schema.projects.sortOrder), desc(schema.projects.createdAt));
  const counts = await db
    .select({ projectId: schema.projectPhotos.projectId, n: sql<number>`count(*)::int` })
    .from(schema.projectPhotos)
    .groupBy(schema.projectPhotos.projectId);
  const countMap = Object.fromEntries(counts.map((c) => [c.projectId, c.n]));
  return rows.map((r) => ({ ...r, photoCount: countMap[r.id] ?? 0, hasUnpublished: hasUnpublishedChanges(r) }));
}

export async function getProject(pid: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.projects).where(eq(schema.projects.id, pid));
  return row ?? null;
}

export async function getProjectBySlug(slug: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.projects).where(eq(schema.projects.slug, slug));
  return row ?? null;
}

/** Ordered photo ids that belong to a project. */
export async function getProjectPhotoIds(pid: string) {
  const db = await getDb();
  const rows = await db
    .select({ photoId: schema.projectPhotos.photoId })
    .from(schema.projectPhotos)
    .where(eq(schema.projectPhotos.projectId, pid))
    .orderBy(asc(schema.projectPhotos.sortOrder));
  return rows.map((r) => r.photoId);
}

async function uniqueSlug(base: string, excludeId?: string) {
  const db = await getDb();
  let slug = slugify(base);
  let n = 1;
  for (;;) {
    const rows = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(excludeId ? and(eq(schema.projects.slug, slug), ne(schema.projects.id, excludeId)) : eq(schema.projects.slug, slug));
    if (!rows.length) return slug;
    slug = `${slugify(base)}-${++n}`;
  }
}

export async function createProject(input: {
  name: string;
  year?: string;
  location?: string;
  description?: string;
  categoryId?: string | null;
  photoIds?: string[];
  autoLayout?: boolean;
}) {
  const db = await getDb();
  const pid = newId("prj");
  const slug = await uniqueSlug(input.name);
  const photoIds = input.photoIds ?? [];
  let draft: BlocksDocument = { version: 1, blocks: [] };
  if (input.autoLayout !== false) {
    const photos = photoIds.length ? await listPhotos({ ids: photoIds }) : [];
    const ordered = photoIds.map((pi) => photos.find((p) => p.id === pi)).filter((p): p is NonNullable<typeof p> => !!p);
    draft = { version: 1, blocks: autoCompose(ordered.map((p) => ({ id: p.id, aspectRatio: p.aspectRatio, orientation: p.orientation, dominantColor: p.dominantColor }))) };
  }
  const [maxOrder] = await db.select({ m: sql<number>`coalesce(min(${schema.projects.sortOrder}), 0)` }).from(schema.projects);
  const [row] = await db
    .insert(schema.projects)
    .values({
      id: pid,
      slug,
      name: input.name,
      year: input.year ?? "",
      location: input.location ?? "",
      description: input.description ?? "",
      categoryId: input.categoryId ?? null,
      coverPhotoId: photoIds[0] ?? null,
      previewToken: token(),
      draft,
      sortOrder: (maxOrder?.m ?? 0) - 1,
    })
    .returning();
  if (photoIds.length) await setProjectPhotos(pid, photoIds);
  return row;
}

export async function setProjectPhotos(pid: string, photoIds: string[]) {
  const db = await getDb();
  await db.delete(schema.projectPhotos).where(eq(schema.projectPhotos.projectId, pid));
  if (photoIds.length) {
    await db.insert(schema.projectPhotos).values(photoIds.map((photoId, i) => ({ projectId: pid, photoId, sortOrder: i }))).onConflictDoNothing();
  }
  // photos without a primary project adopt this one
  await db
    .update(schema.photos)
    .set({ projectId: pid })
    .where(and(inArray(schema.photos.id, photoIds.length ? photoIds : ["-"]), sql`${schema.photos.projectId} is null`));
}

export async function addPhotosToProject(pid: string, photoIds: string[]) {
  if (!photoIds.length) return;
  const existing = await getProjectPhotoIds(pid);
  const merged = [...existing, ...photoIds.filter((p) => !existing.includes(p))];
  await setProjectPhotos(pid, merged);
}

export async function removePhotosFromProject(pid: string, photoIds: string[]) {
  const db = await getDb();
  if (!photoIds.length) return;
  await db
    .delete(schema.projectPhotos)
    .where(and(eq(schema.projectPhotos.projectId, pid), inArray(schema.projectPhotos.photoId, photoIds)));
}

export type ProjectMetaPatch = Partial<
  Pick<
    Project,
    | "name"
    | "slug"
    | "year"
    | "location"
    | "description"
    | "coverPhotoId"
    | "categoryId"
    | "status"
    | "featured"
    | "showOnHome"
    | "showInArchive"
    | "seoTitle"
    | "seoDescription"
    | "ogPhotoId"
    | "sortOrder"
  >
>;

export async function updateProjectMeta(pid: string, patch: ProjectMetaPatch) {
  const db = await getDb();
  const set: ProjectMetaPatch & { updatedAt: Date; draftUpdatedAt: Date } = { ...patch, updatedAt: new Date(), draftUpdatedAt: new Date() };
  if (patch.slug !== undefined) set.slug = await uniqueSlug(patch.slug || patch.name || "project", pid);
  const [row] = await db.update(schema.projects).set(set).where(eq(schema.projects.id, pid)).returning();
  if (!row) throw new Error("Project not found");
  return row;
}

export async function saveProjectDraft(pid: string, document: unknown) {
  const db = await getDb();
  const doc = parseDocument(document);
  const [row] = await db
    .update(schema.projects)
    .set({ draft: doc, draftUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.projects.id, pid))
    .returning();
  if (!row) throw new Error("Project not found");
  // keep membership in sync: photos used in the layout belong to the project
  const used = collectPhotoIds(doc);
  if (used.length) await addPhotosToProject(pid, used);
  return row;
}

export function projectMeta(p: Project): ProjectMeta {
  return {
    name: p.name,
    slug: p.slug,
    year: p.year,
    location: p.location,
    description: p.description,
    coverPhotoId: p.coverPhotoId,
    categoryId: p.categoryId,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogPhotoId: p.ogPhotoId,
  };
}

export async function publishProject(pid: string) {
  const db = await getDb();
  const p = await getProject(pid);
  if (!p) throw new Error("Project not found");
  const now = new Date();
  const snapshot = { meta: projectMeta(p), document: p.draft, publishedAt: now.toISOString() };
  await db
    .update(schema.projects)
    .set({ published: snapshot, publishedAt: now, status: "published", updatedAt: now, draftUpdatedAt: now })
    .where(eq(schema.projects.id, pid));
  await addVersion("project", pid, "publish", `Published`, p.draft, snapshot.meta as unknown as Record<string, unknown>);
  return getProject(pid);
}

export async function unpublishProject(pid: string) {
  const db = await getDb();
  await db.update(schema.projects).set({ status: "draft", updatedAt: new Date() }).where(eq(schema.projects.id, pid));
  return getProject(pid);
}

export async function duplicateProject(pid: string) {
  const db = await getDb();
  const p = await getProject(pid);
  if (!p) throw new Error("Project not found");
  const nid = newId("prj");
  const name = `${p.name} (copy)`;
  const draft: BlocksDocument = JSON.parse(JSON.stringify(p.draft));
  draft.blocks = draft.blocks.map((b) => ({ ...b, id: blockId("b") }));
  const [row] = await db
    .insert(schema.projects)
    .values({
      ...p,
      id: nid,
      name,
      slug: await uniqueSlug(name),
      status: "draft",
      published: null,
      publishedAt: null,
      previewToken: token(),
      draft,
      sortOrder: p.sortOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      draftUpdatedAt: new Date(),
    })
    .returning();
  const ids = await getProjectPhotoIds(pid);
  if (ids.length) await db.insert(schema.projectPhotos).values(ids.map((photoId, i) => ({ projectId: nid, photoId, sortOrder: i })));
  return row;
}

export async function deleteProject(pid: string) {
  const db = await getDb();
  await db.update(schema.photos).set({ projectId: null }).where(eq(schema.photos.projectId, pid));
  await db.delete(schema.versions).where(and(eq(schema.versions.targetType, "project"), eq(schema.versions.targetId, pid)));
  await db.delete(schema.projects).where(eq(schema.projects.id, pid));
}

export async function reorderProjects(ids: string[]) {
  const db = await getDb();
  await Promise.all(ids.map((pid, i) => db.update(schema.projects).set({ sortOrder: i }).where(eq(schema.projects.id, pid))));
}

/* ------------------------------------------------------------------ */
/* Versions                                                             */
/* ------------------------------------------------------------------ */

const MAX_VERSIONS = 40;

export async function addVersion(
  targetType: "project" | "page",
  targetId: string,
  kind: string,
  label: string,
  document: BlocksDocument,
  meta: Record<string, unknown> = {},
) {
  const db = await getDb();
  await db.insert(schema.versions).values({ id: newId("ver"), targetType, targetId, kind, label, document, meta });
  const old = await db
    .select({ id: schema.versions.id })
    .from(schema.versions)
    .where(and(eq(schema.versions.targetType, targetType), eq(schema.versions.targetId, targetId)))
    .orderBy(desc(schema.versions.createdAt))
    .offset(MAX_VERSIONS);
  if (old.length) await db.delete(schema.versions).where(inArray(schema.versions.id, old.map((o) => o.id)));
}

export async function listVersions(targetType: "project" | "page", targetId: string): Promise<Omit<Version, "document">[]> {
  const db = await getDb();
  return db
    .select({
      id: schema.versions.id,
      targetType: schema.versions.targetType,
      targetId: schema.versions.targetId,
      kind: schema.versions.kind,
      label: schema.versions.label,
      meta: schema.versions.meta,
      createdAt: schema.versions.createdAt,
    })
    .from(schema.versions)
    .where(and(eq(schema.versions.targetType, targetType), eq(schema.versions.targetId, targetId)))
    .orderBy(desc(schema.versions.createdAt))
    .limit(MAX_VERSIONS);
}

export async function getVersion(vid: string) {
  const db = await getDb();
  const [v] = await db.select().from(schema.versions).where(eq(schema.versions.id, vid));
  return v ?? null;
}

/* ------------------------------------------------------------------ */
/* Public reads                                                         */
/* ------------------------------------------------------------------ */

export type PublicProject = {
  id: string;
  slug: string;
  meta: ProjectMeta;
  document: BlocksDocument;
  publishedAt: string;
  featured: boolean;
  showOnHome: boolean;
  showInArchive: boolean;
  sortOrder: number;
  categoryName: string;
};

export async function listPublishedProjects(opts: { home?: boolean; archive?: boolean; featured?: boolean } = {}): Promise<PublicProject[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.status, "published"))
    .orderBy(asc(schema.projects.sortOrder), desc(schema.projects.publishedAt));
  const cats = Object.fromEntries((await db.select().from(schema.categories)).map((c) => [c.id, c.name]));
  return rows
    .filter((r) => r.published)
    .filter((r) => (opts.home ? r.showOnHome : true))
    .filter((r) => (opts.archive ? r.showInArchive : true))
    .filter((r) => (opts.featured ? r.featured : true))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      meta: r.published!.meta,
      document: r.published!.document,
      publishedAt: r.published!.publishedAt,
      featured: r.featured,
      showOnHome: r.showOnHome,
      showInArchive: r.showInArchive,
      sortOrder: r.sortOrder,
      categoryName: r.published!.meta.categoryId ? cats[r.published!.meta.categoryId] ?? "" : "",
    }));
}

export async function getPublishedProject(slug: string): Promise<PublicProject | null> {
  const all = await listPublishedProjects();
  return all.find((p) => p.slug === slug || p.meta.slug === slug) ?? null;
}

/** Load every photo a document needs, excluding hidden ones for public use. */
export async function photosForDocument(doc: BlocksDocument, extraIds: string[] = [], opts: { includeHidden?: boolean } = {}) {
  const map = await getPhotoMap([...collectPhotoIds(doc), ...extraIds]);
  if (!opts.includeHidden) {
    for (const k of Object.keys(map)) if (map[k].hidden) delete map[k];
  }
  return map;
}
