"use client";

import { create } from "zustand";
import { GitClient, type GitFileChange, type GitConfig } from "@/lib/github/client";
import { paths } from "./paths";
import { photoView } from "./photo-view";
import { defaultPage, defaultSite } from "./defaults";
import {
  categoriesFileSchema,
  hasUnpublished,
  pageDraftSchema,
  pageFileSchema,
  photosFileSchema,
  projectDraftSchema,
  projectFileSchema,
  siteSettingsSchema,
  PAGE_SLUGS,
  type Category,
  type PageDraft,
  type PageFile,
  type PageSlug,
  type PhotoRecord,
  type ProjectDraft,
  type ProjectFile,
  type ProjectMeta,
  type SiteSettings,
} from "./types";
import { parseDocument, type BlocksDocument, collectPhotoIds, newId as blockId } from "@/lib/blocks/schema";
import { autoCompose } from "@/lib/blocks/templates";
import { blobToBase64, processInBrowser } from "@/lib/images/browser";
import type { PhotoView } from "@/lib/photos/view";

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

const now = () => new Date().toISOString();
const rid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
const j = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

export function slugify(input: string) {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}

export type ProjectEntry = { file: ProjectFile; draft: ProjectDraft };
export type PageEntry = { file: PageFile; draft: PageDraft };

export type AdminState = {
  client: GitClient | null;
  login: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /** Message of the commit in flight, for the UI. */
  busy: string | null;
  site: SiteSettings;
  categories: Category[];
  photos: PhotoRecord[];
  projects: ProjectEntry[];
  pages: Record<PageSlug, PageEntry>;
};

const emptyPages = () => Object.fromEntries(PAGE_SLUGS.map((s) => [s, defaultPage(s)])) as Record<PageSlug, PageEntry>;

export const useAdminState = create<AdminState>(() => ({
  client: null,
  login: "",
  loaded: false,
  loading: false,
  error: null,
  busy: null,
  site: defaultSite(),
  categories: [],
  photos: [],
  projects: [],
  pages: emptyPages(),
}));

const set = useAdminState.setState;
const get = useAdminState.getState;

/* Commits run strictly one after another. */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    set({ busy: label });
    try {
      return await fn();
    } finally {
      set({ busy: null });
    }
  });
  queue = run.catch(() => {});
  return run;
}

function client() {
  const c = get().client;
  if (!c) throw new Error("Not signed in");
  return c;
}

/* ------------------------------------------------------------------ */
/* session                                                              */
/* ------------------------------------------------------------------ */

export const TOKEN_KEY = "pf_gh_token";
export const REPO_KEY = "pf_gh_repo";

export async function signIn(cfg: GitConfig) {
  const c = new GitClient(cfg);
  const who = await c.verify();
  if (!who.canPush) throw new Error(`Token for ${who.login} cannot push to ${cfg.owner}/${cfg.repo}. Use a fine-grained token with Contents: read & write.`);
  set({ client: c, login: who.login, error: null });
  try {
    localStorage.setItem(TOKEN_KEY, cfg.token);
    localStorage.setItem(REPO_KEY, JSON.stringify({ owner: cfg.owner, repo: cfg.repo, branch: cfg.branch }));
  } catch {
    /* private mode */
  }
  await loadAll();
}

export function signOut() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
  set({ client: null, login: "", loaded: false, photos: [], projects: [], pages: emptyPages() });
}

export async function loadAll() {
  const c = client();
  set({ loading: true, error: null });
  try {
    const [siteRaw, photosRaw, catsRaw, tree] = await Promise.all([
      c.readJson<unknown>(paths.site),
      c.readJson<unknown>(paths.photos),
      c.readJson<unknown>(paths.categories),
      c.listTree("content"),
    ]);
    const site = siteSettingsSchema.parse(siteRaw ?? {});
    const photos = photosFileSchema.parse(photosRaw ?? {}).photos;
    const categories = categoriesFileSchema.parse(catsRaw ?? {}).categories;
    const projectIds = tree.filter((t) => t.type === "blob" && /^content\/projects\/[^/]+\/project\.json$/.test(t.path)).map((t) => t.path.split("/")[2]);
    const projects = (
      await Promise.all(
        projectIds.map(async (id) => {
          const [f, d] = await Promise.all([c.readJson<unknown>(paths.project(id)), c.readJson<unknown>(paths.projectDraft(id))]);
          if (!f) return null;
          const file = projectFileSchema.parse(f);
          const draft = d ? projectDraftSchema.parse(d) : { meta: file.published?.meta ?? { name: id, slug: file.slug, year: "", location: "", description: "", coverPhotoId: null, categoryId: null, seoTitle: "", seoDescription: "", ogPhotoId: null }, document: file.published?.document ?? { version: 1 as const, blocks: [] }, draftUpdatedAt: file.updatedAt };
          return { file, draft: { ...draft, document: parseDocument(draft.document) } } as ProjectEntry;
        }),
      )
    ).filter((p): p is ProjectEntry => !!p);
    projects.sort((a, b) => a.file.sortOrder - b.file.sortOrder || b.file.createdAt.localeCompare(a.file.createdAt));
    const pages = emptyPages();
    await Promise.all(
      PAGE_SLUGS.map(async (slug) => {
        const [f, d] = await Promise.all([c.readJson<unknown>(paths.page(slug)), c.readJson<unknown>(paths.pageDraft(slug))]);
        if (f) pages[slug].file = pageFileSchema.parse(f);
        if (d) pages[slug].draft = pageDraftSchema.parse(d);
        pages[slug].draft.document = parseDocument(pages[slug].draft.document);
      }),
    );
    set({ site, photos, categories, projects, pages, loaded: true, loading: false });
  } catch (e) {
    set({ loading: false, error: e instanceof Error ? e.message : "Could not load content" });
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* derived                                                              */
/* ------------------------------------------------------------------ */

export function views(photos = get().photos): PhotoView[] {
  const c = get().client;
  const cats = get().categories;
  return photos.map((p) => photoView(p, { categories: cats, rawBase: c?.rawBase }));
}

export function viewMap(ids?: string[]): Record<string, PhotoView> {
  const list = views();
  const wanted = ids ? new Set(ids) : null;
  return Object.fromEntries(list.filter((p) => !wanted || wanted.has(p.id)).map((p) => [p.id, p]));
}

export function projectEntry(id: string) {
  return get().projects.find((p) => p.file.id === id) ?? null;
}

export function projectHasUnpublished(p: ProjectEntry) {
  return hasUnpublished(p.draft.draftUpdatedAt, p.file.publishedAt);
}
export function pageHasUnpublished(p: PageEntry) {
  return hasUnpublished(p.draft.draftUpdatedAt, p.file.publishedAt);
}

/* ------------------------------------------------------------------ */
/* photos                                                               */
/* ------------------------------------------------------------------ */

function photosChange(photos: PhotoRecord[]): GitFileChange {
  return { path: paths.photos, content: j({ photos }) };
}

export type UploadProgress = { name: string; state: "queued" | "processing" | "uploading" | "done" | "error"; error?: string };

export async function uploadPhotos(
  files: File[],
  extra: { projectId?: string | null; categoryId?: string | null } = {},
  onProgress?: (p: UploadProgress[]) => void,
): Promise<PhotoView[]> {
  const progress: UploadProgress[] = files.map((f) => ({ name: f.name, state: "queued" }));
  const report = () => onProgress?.([...progress]);
  report();
  const added: PhotoRecord[] = [];
  const maxPx = get().site.uploadMaxPx;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    progress[i].state = "processing";
    report();
    try {
      const pr = await processInBrowser(f, { maxPx });
      const id = rid("ph");
      const baseName = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const rec: PhotoRecord = {
        id,
        filename: f.name,
        ext: pr.ext,
        mime: pr.mime,
        bytes: pr.original.size,
        width: pr.width,
        height: pr.height,
        aspectRatio: pr.aspectRatio,
        orientation: pr.orientation,
        dominantColor: pr.dominantColor,
        lqip: pr.lqip,
        originalSha: "",
        title: "",
        description: "",
        alt: baseName ? `Photograph: ${baseName}` : "",
        altSuggested: true,
        year: "",
        location: "",
        camera: "",
        lens: "",
        categoryId: extra.categoryId ?? null,
        projectId: extra.projectId ?? null,
        hidden: false,
        featured: false,
        showOnHome: false,
        showInArchive: true,
        archiveOrder: get().photos.length + added.length,
        focalX: 0.5,
        focalY: 0.5,
        createdAt: now(),
        updatedAt: now(),
      };
      progress[i].state = "uploading";
      report();
      const [orig, thumb, preview] = await Promise.all([blobToBase64(pr.original), blobToBase64(pr.thumb), blobToBase64(pr.preview)]);
      await enqueue(`Uploading ${f.name}`, async () => {
        const photos = [...get().photos, rec];
        const changes: GitFileChange[] = [
          { path: paths.photoOriginal(id, pr.ext), base64: orig },
          { path: paths.photoThumb(id), base64: thumb },
          { path: paths.photoPreview(id), base64: preview },
          photosChange(photos),
        ];
        const r = await client().commit(`Upload photo ${f.name}`, changes);
        rec.originalSha = r.blobs[paths.photoOriginal(id, pr.ext)] ?? "";
        set({ photos: photos.map((p) => (p.id === id ? rec : p)) });
        if (extra.projectId) await addPhotosToProjectLocal(extra.projectId, [id]);
      });
      added.push(rec);
      progress[i].state = "done";
    } catch (e) {
      progress[i].state = "error";
      progress[i].error = e instanceof Error ? e.message : "Failed";
    }
    report();
  }
  return views(added);
}

export type PhotoPatch = Partial<Omit<PhotoRecord, "id" | "createdAt">>;

export async function updatePhoto(id: string, patch: PhotoPatch) {
  return bulkUpdatePhotos([id], patch, `Update photo ${get().photos.find((p) => p.id === id)?.filename ?? id}`);
}

export async function bulkUpdatePhotos(ids: string[], patch: PhotoPatch, message = `Update ${ids.length} photos`) {
  const apply = (p: PhotoRecord) => (ids.includes(p.id) ? { ...p, ...patch, altSuggested: patch.alt !== undefined ? false : p.altSuggested, updatedAt: now() } : p);
  set({ photos: get().photos.map(apply) }); // optimistic
  return enqueue(message, async () => {
    const photos = get().photos;
    await client().commit(message, [photosChange(photos)]);
    return views(photos.filter((p) => ids.includes(p.id)));
  });
}

export async function setArchiveOrder(ids: string[]) {
  const order = new Map(ids.map((id, i) => [id, i]));
  set({ photos: get().photos.map((p) => (order.has(p.id) ? { ...p, archiveOrder: order.get(p.id)! } : p)) });
  return enqueue("Reorder archive", async () => client().commit("Reorder archive", [photosChange(get().photos)]));
}

export async function deletePhotos(ids: string[]) {
  const victims = get().photos.filter((p) => ids.includes(p.id));
  set({ photos: get().photos.filter((p) => !ids.includes(p.id)) });
  return enqueue(`Delete ${ids.length} photo${ids.length > 1 ? "s" : ""}`, async () => {
    const changes: GitFileChange[] = [photosChange(get().photos)];
    for (const v of victims) {
      changes.push({ path: paths.photoOriginal(v.id, v.ext), delete: true }, { path: paths.photoThumb(v.id), delete: true }, { path: paths.photoPreview(v.id), delete: true });
    }
    // drop membership + cover references
    const projects = get().projects.map((p) => {
      const photoIds = p.file.photoIds.filter((x) => !ids.includes(x));
      const cover = p.draft.meta.coverPhotoId && ids.includes(p.draft.meta.coverPhotoId) ? null : p.draft.meta.coverPhotoId;
      if (photoIds.length !== p.file.photoIds.length) changes.push({ path: paths.project(p.file.id), content: j({ ...p.file, photoIds, updatedAt: now() }) });
      if (cover !== p.draft.meta.coverPhotoId) changes.push({ path: paths.projectDraft(p.file.id), content: j({ ...p.draft, meta: { ...p.draft.meta, coverPhotoId: cover } }) });
      return { file: { ...p.file, photoIds }, draft: { ...p.draft, meta: { ...p.draft.meta, coverPhotoId: cover } } };
    });
    await client().commit(`Delete ${victims.map((v) => v.filename).join(", ")}`, changes);
    set({ projects });
  });
}

export async function replacePhotoFile(id: string, file: File): Promise<PhotoView> {
  const old = get().photos.find((p) => p.id === id);
  if (!old) throw new Error("Photo not found");
  const pr = await processInBrowser(file, { maxPx: get().site.uploadMaxPx });
  const [orig, thumb, preview] = await Promise.all([blobToBase64(pr.original), blobToBase64(pr.thumb), blobToBase64(pr.preview)]);
  return enqueue(`Replacing ${old.filename}`, async () => {
    const rec: PhotoRecord = {
      ...old,
      filename: file.name,
      ext: pr.ext,
      mime: pr.mime,
      bytes: pr.original.size,
      width: pr.width,
      height: pr.height,
      aspectRatio: pr.aspectRatio,
      orientation: pr.orientation,
      dominantColor: pr.dominantColor,
      lqip: pr.lqip,
      updatedAt: now(),
    };
    const photos = get().photos.map((p) => (p.id === id ? rec : p));
    const changes: GitFileChange[] = [
      { path: paths.photoOriginal(id, pr.ext), base64: orig },
      { path: paths.photoThumb(id), base64: thumb },
      { path: paths.photoPreview(id), base64: preview },
      photosChange(photos),
    ];
    if (old.ext !== pr.ext) changes.push({ path: paths.photoOriginal(id, old.ext), delete: true });
    const r = await client().commit(`Replace photo ${old.filename} → ${file.name}`, changes);
    rec.originalSha = r.blobs[paths.photoOriginal(id, pr.ext)] ?? "";
    set({ photos: photos.map((p) => (p.id === id ? rec : p)) });
    return views([rec])[0];
  });
}

export async function createCategory(name: string) {
  const slug = slugify(name);
  const existing = get().categories.find((c) => c.slug === slug);
  if (existing) return existing;
  const cat: Category = { id: rid("cat"), name: name.trim(), slug, sortOrder: get().categories.length };
  const categories = [...get().categories, cat];
  set({ categories });
  await enqueue(`Add category ${name}`, () => client().commit(`Add category ${name}`, [{ path: paths.categories, content: j({ categories }) }]));
  return cat;
}

export async function deleteCategory(id: string) {
  const categories = get().categories.filter((c) => c.id !== id);
  const photos = get().photos.map((p) => (p.categoryId === id ? { ...p, categoryId: null } : p));
  set({ categories, photos });
  await enqueue("Delete category", () => client().commit("Delete category", [{ path: paths.categories, content: j({ categories }) }, photosChange(photos)]));
}

/* ------------------------------------------------------------------ */
/* projects                                                             */
/* ------------------------------------------------------------------ */

function uniqueSlug(base: string, excludeId?: string) {
  const taken = new Set(get().projects.filter((p) => p.file.id !== excludeId).map((p) => p.file.slug));
  let slug = slugify(base);
  let n = 1;
  while (taken.has(slug)) slug = `${slugify(base)}-${++n}`;
  return slug;
}

function replaceProject(entry: ProjectEntry) {
  set({ projects: get().projects.map((p) => (p.file.id === entry.file.id ? entry : p)) });
}

export async function createProject(input: { name: string; year?: string; location?: string; description?: string; categoryId?: string | null; photoIds?: string[]; autoLayout?: boolean }) {
  const id = rid("prj");
  const photoIds = input.photoIds ?? [];
  const t = now();
  const chosen = photoIds.map((pid) => get().photos.find((p) => p.id === pid)).filter((p): p is PhotoRecord => !!p);
  const document: BlocksDocument = {
    version: 1,
    blocks: input.autoLayout === false ? [] : autoCompose(chosen.map((p) => ({ id: p.id, aspectRatio: p.aspectRatio, orientation: p.orientation, dominantColor: p.dominantColor }))),
  };
  const minOrder = Math.min(0, ...get().projects.map((p) => p.file.sortOrder));
  const file: ProjectFile = { id, slug: uniqueSlug(input.name), status: "draft", sortOrder: minOrder - 1, featured: false, showOnHome: true, showInArchive: true, photoIds, published: null, publishedAt: null, createdAt: t, updatedAt: t };
  const draft: ProjectDraft = {
    meta: { name: input.name, slug: file.slug, year: input.year ?? "", location: input.location ?? "", description: input.description ?? "", coverPhotoId: photoIds[0] ?? null, categoryId: input.categoryId ?? null, seoTitle: "", seoDescription: "", ogPhotoId: null },
    document,
    draftUpdatedAt: t,
  };
  const entry = { file, draft };
  set({ projects: [entry, ...get().projects] });
  const photos = get().photos.map((p) => (photoIds.includes(p.id) && !p.projectId ? { ...p, projectId: id } : p));
  set({ photos });
  await enqueue(`Create project ${input.name}`, () =>
    client().commit(`Create project ${input.name}`, [{ path: paths.project(id), content: j(file) }, { path: paths.projectDraft(id), content: j(draft) }, photosChange(photos)]),
  );
  return entry;
}

export type ProjectFlagsPatch = Partial<Pick<ProjectFile, "status" | "featured" | "showOnHome" | "showInArchive" | "sortOrder">>;

/** Public flags live in project.json and take effect on the next deploy. */
export async function updateProjectFlags(id: string, patch: ProjectFlagsPatch) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  const file = { ...p.file, ...patch, updatedAt: now() };
  replaceProject({ ...p, file });
  await enqueue(`Update ${p.draft.meta.name}`, () => client().commit(`Update project ${p.draft.meta.name}`, [{ path: paths.project(id), content: j(file) }]));
  return file;
}

/** Editorial meta lives in the draft until published. */
export async function updateProjectMeta(id: string, patch: Partial<ProjectMeta>) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  const meta = { ...p.draft.meta, ...patch };
  if (patch.slug !== undefined || patch.name !== undefined) meta.slug = uniqueSlug(patch.slug || meta.slug || meta.name, id);
  const draft = { ...p.draft, meta, draftUpdatedAt: now() };
  replaceProject({ ...p, draft });
  await enqueue(`Save ${meta.name}`, () => client().commit(`Save draft: ${meta.name} (settings)`, [{ path: paths.projectDraft(id), content: j(draft) }]));
  return draft;
}

export async function saveProjectDraft(id: string, document: unknown) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  const doc = parseDocument(document);
  const draft = { ...p.draft, document: doc, draftUpdatedAt: now() };
  const used = collectPhotoIds(doc);
  const photoIds = [...p.file.photoIds, ...used.filter((x) => !p.file.photoIds.includes(x))];
  const file = photoIds.length !== p.file.photoIds.length ? { ...p.file, photoIds, updatedAt: now() } : p.file;
  replaceProject({ file, draft });
  await enqueue(`Saving ${p.draft.meta.name}`, () => {
    const changes: GitFileChange[] = [{ path: paths.projectDraft(id), content: j(draft) }];
    if (file !== p.file) changes.push({ path: paths.project(id), content: j(file) });
    return client().commit(`Save draft: ${p.draft.meta.name}`, changes);
  });
  return { draftUpdatedAt: draft.draftUpdatedAt, hasUnpublished: hasUnpublished(draft.draftUpdatedAt, file.publishedAt) };
}

export async function publishProject(id: string) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  const t = now();
  const file: ProjectFile = { ...p.file, slug: p.draft.meta.slug, status: "published", published: { meta: p.draft.meta, document: p.draft.document, publishedAt: t }, publishedAt: t, updatedAt: t };
  const draft = { ...p.draft, draftUpdatedAt: t };
  replaceProject({ file, draft });
  await enqueue(`Publishing ${p.draft.meta.name}`, () =>
    client().commit(`Publish: ${p.draft.meta.name}`, [{ path: paths.project(id), content: j(file) }, { path: paths.projectDraft(id), content: j(draft) }]),
  );
  return file;
}

export async function unpublishProject(id: string) {
  return updateProjectFlags(id, { status: "draft" });
}

export async function duplicateProject(id: string) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  const nid = rid("prj");
  const name = `${p.draft.meta.name} (copy)`;
  const t = now();
  const document: BlocksDocument = JSON.parse(JSON.stringify(p.draft.document));
  document.blocks = document.blocks.map((b) => ({ ...b, id: blockId("b") }));
  const file: ProjectFile = { ...p.file, id: nid, slug: uniqueSlug(name), status: "draft", published: null, publishedAt: null, sortOrder: p.file.sortOrder + 1, createdAt: t, updatedAt: t };
  const draft: ProjectDraft = { meta: { ...p.draft.meta, name, slug: file.slug }, document, draftUpdatedAt: t };
  const entry = { file, draft };
  set({ projects: [...get().projects, entry].sort((a, b) => a.file.sortOrder - b.file.sortOrder) });
  await enqueue(`Duplicate ${p.draft.meta.name}`, () => client().commit(`Duplicate project ${p.draft.meta.name}`, [{ path: paths.project(nid), content: j(file) }, { path: paths.projectDraft(nid), content: j(draft) }]));
  return entry;
}

export async function deleteProject(id: string) {
  const p = projectEntry(id);
  if (!p) return;
  set({ projects: get().projects.filter((x) => x.file.id !== id) });
  const photos = get().photos.map((ph) => (ph.projectId === id ? { ...ph, projectId: null } : ph));
  set({ photos });
  await enqueue(`Delete ${p.draft.meta.name}`, () =>
    client().commit(`Delete project ${p.draft.meta.name}`, [{ path: paths.project(id), delete: true }, { path: paths.projectDraft(id), delete: true }, photosChange(photos)]),
  );
}

export async function reorderProjects(ids: string[]) {
  const order = new Map(ids.map((id, i) => [id, i]));
  const projects = get()
    .projects.map((p) => (order.has(p.file.id) ? { ...p, file: { ...p.file, sortOrder: order.get(p.file.id)! } } : p))
    .sort((a, b) => a.file.sortOrder - b.file.sortOrder);
  set({ projects });
  await enqueue("Reorder projects", () => client().commit("Reorder projects", projects.map((p) => ({ path: paths.project(p.file.id), content: j(p.file) }))));
}

async function addPhotosToProjectLocal(id: string, photoIds: string[]) {
  const p = projectEntry(id);
  if (!p) return;
  const merged = [...p.file.photoIds, ...photoIds.filter((x) => !p.file.photoIds.includes(x))];
  if (merged.length === p.file.photoIds.length) return;
  const file = { ...p.file, photoIds: merged, updatedAt: now() };
  replaceProject({ ...p, file });
  await client().commit(`Add photos to ${p.draft.meta.name}`, [{ path: paths.project(id), content: j(file) }]);
}

export async function setProjectPhotos(id: string, photoIds: string[]) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  const file = { ...p.file, photoIds, updatedAt: now() };
  const photos = get().photos.map((ph) => (photoIds.includes(ph.id) && !ph.projectId ? { ...ph, projectId: id } : ph));
  replaceProject({ ...p, file });
  set({ photos });
  await enqueue(`Update photos of ${p.draft.meta.name}`, () => client().commit(`Update photos of ${p.draft.meta.name}`, [{ path: paths.project(id), content: j(file) }, photosChange(photos)]));
}

export async function addPhotosToProject(id: string, photoIds: string[]) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  return setProjectPhotos(id, [...p.file.photoIds, ...photoIds.filter((x) => !p.file.photoIds.includes(x))]);
}

export async function removePhotosFromProject(id: string, photoIds: string[]) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  return setProjectPhotos(id, p.file.photoIds.filter((x) => !photoIds.includes(x)));
}

/** Append an image-group block to a project draft (library → Create group). */
export async function appendBlock(id: string, block: BlocksDocument["blocks"][number]) {
  const p = projectEntry(id);
  if (!p) throw new Error("Project not found");
  return saveProjectDraft(id, { ...p.draft.document, blocks: [...p.draft.document.blocks, block] });
}

/* ------------------------------------------------------------------ */
/* pages                                                                */
/* ------------------------------------------------------------------ */

function replacePage(slug: PageSlug, entry: PageEntry) {
  set({ pages: { ...get().pages, [slug]: entry } });
}

export async function savePageDraft(slug: PageSlug, document: unknown) {
  const p = get().pages[slug];
  const draft = { ...p.draft, document: parseDocument(document), draftUpdatedAt: now() };
  replacePage(slug, { ...p, draft });
  await enqueue(`Saving ${p.draft.meta.title}`, () => client().commit(`Save draft: ${p.draft.meta.title} page`, [{ path: paths.pageDraft(slug), content: j(draft) }]));
  return { draftUpdatedAt: draft.draftUpdatedAt, hasUnpublished: hasUnpublished(draft.draftUpdatedAt, p.file.publishedAt) };
}

export async function updatePageMeta(slug: PageSlug, patch: Partial<PageEntry["draft"]["meta"]>) {
  const p = get().pages[slug];
  const draft = { ...p.draft, meta: { ...p.draft.meta, ...patch }, draftUpdatedAt: now() };
  replacePage(slug, { ...p, draft });
  await enqueue(`Save ${draft.meta.title}`, () => client().commit(`Save draft: ${draft.meta.title} page (settings)`, [{ path: paths.pageDraft(slug), content: j(draft) }]));
  return draft;
}

export async function publishPage(slug: PageSlug) {
  const p = get().pages[slug];
  const t = now();
  const file: PageFile = { slug, published: { meta: p.draft.meta, document: p.draft.document, publishedAt: t }, publishedAt: t, updatedAt: t };
  const draft = { ...p.draft, draftUpdatedAt: t };
  replacePage(slug, { file, draft });
  await enqueue(`Publishing ${p.draft.meta.title}`, () => client().commit(`Publish: ${p.draft.meta.title} page`, [{ path: paths.page(slug), content: j(file) }, { path: paths.pageDraft(slug), content: j(draft) }]));
  return file;
}

/* ------------------------------------------------------------------ */
/* site                                                                 */
/* ------------------------------------------------------------------ */

export async function saveSite(patch: Partial<SiteSettings>) {
  const site = siteSettingsSchema.parse({ ...get().site, ...patch });
  set({ site });
  await enqueue("Save settings", () => client().commit("Update site settings", [{ path: paths.site, content: j(site) }]));
  return site;
}

/* ------------------------------------------------------------------ */
/* versions (git history)                                               */
/* ------------------------------------------------------------------ */

export type VersionInfo = { sha: string; label: string; kind: "publish" | "draft" | "other"; date: string };

export async function listVersions(type: "project" | "page", id: string): Promise<VersionInfo[]> {
  const dir = type === "project" ? paths.projectDir(id) : `${paths.pagesDir}/${id}`;
  const list = await client().history(dir, 40);
  return list.map((c) => ({ sha: c.sha, label: c.message.split("\n")[0], kind: c.message.startsWith("Publish") ? "publish" : c.message.startsWith("Save draft") ? "draft" : "other", date: c.date }));
}

export async function readVersionDocument(type: "project" | "page", id: string, sha: string): Promise<BlocksDocument | null> {
  const draftPath = type === "project" ? paths.projectDraft(id) : paths.pageDraft(id as PageSlug);
  const raw = await client().readJson<{ document?: unknown }>(draftPath, sha);
  if (raw?.document) return parseDocument(raw.document);
  const filePath = type === "project" ? paths.project(id) : paths.page(id as PageSlug);
  const f = await client().readJson<{ published?: { document?: unknown } | null }>(filePath, sha);
  return f?.published?.document ? parseDocument(f.published.document) : null;
}
