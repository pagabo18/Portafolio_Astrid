import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { processImage } from "@/lib/images/process";
import { id as newId } from "@/lib/ids";
import type { Photo, Category } from "@/lib/db/schema";
import type { PhotoMap, PhotoView } from "@/lib/photos/view";

export function toPhotoView(p: Photo, categories: Record<string, Category> = {}): PhotoView {
  const storage = getStorage();
  const by = (f: "avif" | "webp" | "jpeg") =>
    p.variants
      .filter((v) => v.format === f)
      .sort((a, b) => a.width - b.width)
      .map((v) => ({ width: v.width, height: v.height, url: storage.url(v.path) }));
  return {
    id: p.id,
    filename: p.filename,
    width: p.width,
    height: p.height,
    aspectRatio: p.aspectRatio,
    orientation: p.orientation,
    bytes: p.bytes,
    mime: p.mime,
    title: p.title,
    description: p.description,
    alt: p.alt,
    altSuggested: p.altSuggested,
    year: p.year,
    location: p.location,
    camera: p.camera,
    lens: p.lens,
    categoryId: p.categoryId,
    categoryName: p.categoryId ? categories[p.categoryId]?.name ?? "" : "",
    projectId: p.projectId,
    hidden: p.hidden,
    featured: p.featured,
    showOnHome: p.showOnHome,
    showInArchive: p.showInArchive,
    archiveOrder: p.archiveOrder,
    focalX: p.focalX,
    focalY: p.focalY,
    lqip: p.lqip,
    dominantColor: p.dominantColor,
    thumbUrl: storage.url(p.thumbPath),
    originalUrl: storage.url(p.originalPath),
    sources: { avif: by("avif"), webp: by("webp"), jpeg: by("jpeg") },
    createdAt: p.createdAt.toISOString(),
  };
}

export async function listCategories() {
  const db = await getDb();
  return db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
}

async function categoryMap() {
  const cats = await listCategories();
  return Object.fromEntries(cats.map((c) => [c.id, c]));
}

export type PhotoFilters = {
  q?: string;
  categoryId?: string;
  projectId?: string;
  orientation?: string;
  hidden?: "all" | "visible" | "hidden";
  year?: string;
  sort?: "newest" | "oldest" | "name" | "size" | "archive";
  ids?: string[];
};

export async function listPhotos(f: PhotoFilters = {}): Promise<PhotoView[]> {
  const db = await getDb();
  const where: SQL[] = [];
  if (f.q) {
    const q = `%${f.q}%`;
    where.push(
      or(
        ilike(schema.photos.filename, q),
        ilike(schema.photos.title, q),
        ilike(schema.photos.location, q),
        ilike(schema.photos.description, q),
        ilike(schema.photos.camera, q),
      )!,
    );
  }
  if (f.categoryId) where.push(eq(schema.photos.categoryId, f.categoryId));
  if (f.projectId) where.push(eq(schema.photos.projectId, f.projectId));
  if (f.orientation) where.push(eq(schema.photos.orientation, f.orientation));
  if (f.year) where.push(eq(schema.photos.year, f.year));
  if (f.hidden === "visible") where.push(eq(schema.photos.hidden, false));
  if (f.hidden === "hidden") where.push(eq(schema.photos.hidden, true));
  if (f.ids) {
    if (!f.ids.length) return [];
    where.push(inArray(schema.photos.id, f.ids));
  }
  const order =
    f.sort === "oldest"
      ? asc(schema.photos.createdAt)
      : f.sort === "name"
        ? asc(schema.photos.filename)
        : f.sort === "size"
          ? desc(schema.photos.bytes)
          : f.sort === "archive"
            ? asc(schema.photos.archiveOrder)
            : desc(schema.photos.createdAt);
  const rows = await db
    .select()
    .from(schema.photos)
    .where(where.length ? and(...where) : undefined)
    .orderBy(order, desc(schema.photos.createdAt));
  const cats = await categoryMap();
  return rows.map((r) => toPhotoView(r, cats));
}

export async function getPhotoMap(ids: string[]): Promise<PhotoMap> {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return {};
  const list = await listPhotos({ ids: uniq });
  return Object.fromEntries(list.map((p) => [p.id, p]));
}

export async function getPhoto(idv: string): Promise<PhotoView | null> {
  const list = await listPhotos({ ids: [idv] });
  return list[0] ?? null;
}

/** Store a new upload: process, persist files, create the row. */
export async function createPhotoFromUpload(file: { name: string; data: Buffer }, extra: Partial<Pick<Photo, "projectId" | "categoryId">> = {}) {
  const db = await getDb();
  const storage = getStorage();
  const photoId = newId("ph");
  const processed = await processImage(file.data, photoId);
  for (const f of processed.files) await storage.put(f.key, f.data, f.contentType);
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  const [row] = await db
    .insert(schema.photos)
    .values({
      id: photoId,
      filename: file.name,
      originalPath: processed.originalKey,
      mime: processed.mime,
      bytes: file.data.byteLength,
      width: processed.width,
      height: processed.height,
      aspectRatio: processed.aspectRatio,
      orientation: processed.orientation,
      dominantColor: processed.dominantColor,
      lqip: processed.lqip,
      variants: processed.variants,
      thumbPath: processed.thumbKey,
      title: "",
      alt: baseName ? `Photograph: ${baseName}` : "",
      altSuggested: true,
      exif: processed.exif,
      projectId: extra.projectId ?? null,
      categoryId: extra.categoryId ?? null,
    })
    .returning();
  if (extra.projectId) {
    await db
      .insert(schema.projectPhotos)
      .values({ projectId: extra.projectId, photoId, sortOrder: Date.now() % 1_000_000 })
      .onConflictDoNothing();
  }
  return toPhotoView(row, await categoryMap());
}

/** Replace the file of an existing photo, keeping every setting and placement. */
export async function replacePhotoFile(photoId: string, file: { name: string; data: Buffer }) {
  const db = await getDb();
  const storage = getStorage();
  const [existing] = await db.select().from(schema.photos).where(eq(schema.photos.id, photoId));
  if (!existing) throw new Error("Photo not found");
  const oldKeys = [existing.originalPath, existing.thumbPath, ...existing.variants.map((v) => v.path)];
  // new files use a fresh sub-id so old URLs are not cached wrongly
  const fileId = `${photoId}/r${Date.now().toString(36)}`;
  const processed = await processImage(file.data, fileId);
  for (const f of processed.files) await storage.put(f.key, f.data, f.contentType);
  const [row] = await db
    .update(schema.photos)
    .set({
      filename: file.name,
      originalPath: processed.originalKey,
      mime: processed.mime,
      bytes: file.data.byteLength,
      width: processed.width,
      height: processed.height,
      aspectRatio: processed.aspectRatio,
      orientation: processed.orientation,
      dominantColor: processed.dominantColor,
      lqip: processed.lqip,
      variants: processed.variants,
      thumbPath: processed.thumbKey,
      exif: processed.exif,
      updatedAt: new Date(),
    })
    .where(eq(schema.photos.id, photoId))
    .returning();
  await storage.delete(oldKeys.filter((k) => !processed.files.some((f) => f.key === k)));
  return toPhotoView(row, await categoryMap());
}

export type PhotoPatch = Partial<
  Pick<
    Photo,
    | "title"
    | "description"
    | "alt"
    | "year"
    | "location"
    | "camera"
    | "lens"
    | "categoryId"
    | "projectId"
    | "hidden"
    | "featured"
    | "showOnHome"
    | "showInArchive"
    | "archiveOrder"
    | "focalX"
    | "focalY"
  >
>;

export async function updatePhoto(photoId: string, patch: PhotoPatch) {
  const db = await getDb();
  const set: PhotoPatch & { updatedAt: Date; altSuggested?: boolean } = { ...patch, updatedAt: new Date() };
  if (patch.alt !== undefined) set.altSuggested = false;
  const [row] = await db.update(schema.photos).set(set).where(eq(schema.photos.id, photoId)).returning();
  if (!row) throw new Error("Photo not found");
  return toPhotoView(row, await categoryMap());
}

export async function bulkUpdatePhotos(ids: string[], patch: PhotoPatch) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .update(schema.photos)
    .set({ ...patch, updatedAt: new Date() })
    .where(inArray(schema.photos.id, ids))
    .returning();
  const cats = await categoryMap();
  return rows.map((r) => toPhotoView(r, cats));
}

export async function deletePhotos(ids: string[]) {
  if (!ids.length) return;
  const db = await getDb();
  const storage = getStorage();
  const rows = await db.select().from(schema.photos).where(inArray(schema.photos.id, ids));
  const keys = rows.flatMap((r) => [r.originalPath, r.thumbPath, ...r.variants.map((v) => v.path)]);
  await db.delete(schema.photos).where(inArray(schema.photos.id, ids));
  // clear cover references
  await db.update(schema.projects).set({ coverPhotoId: null }).where(inArray(schema.projects.coverPhotoId, ids));
  await storage.delete(keys);
}

export async function setArchiveOrder(ids: string[]) {
  const db = await getDb();
  await Promise.all(ids.map((pid, i) => db.update(schema.photos).set({ archiveOrder: i }).where(eq(schema.photos.id, pid))));
}

export async function createCategory(name: string, slug: string) {
  const db = await getDb();
  const [row] = await db
    .insert(schema.categories)
    .values({ id: newId("cat"), name, slug, sortOrder: 0 })
    .onConflictDoUpdate({ target: schema.categories.slug, set: { name } })
    .returning();
  return row;
}

export async function deleteCategory(catId: string) {
  const db = await getDb();
  await db.delete(schema.categories).where(eq(schema.categories.id, catId));
}

export async function photoYears(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ year: schema.photos.year })
    .from(schema.photos)
    .where(sql`${schema.photos.year} <> ''`)
    .orderBy(desc(schema.photos.year));
  return rows.map((r) => r.year);
}
