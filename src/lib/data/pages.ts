import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { id as newId, token } from "@/lib/ids";
import { parseDocument, type BlocksDocument } from "@/lib/blocks/schema";
import { createBlock } from "@/lib/blocks/templates";
import type { Page, PageMeta } from "@/lib/db/schema";
import { addVersion, hasUnpublishedChanges } from "./projects";

export const PAGE_SLUGS = ["home", "archive", "about"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

const DEFAULTS: Record<PageSlug, { title: string; blocks: () => BlocksDocument["blocks"] }> = {
  home: {
    title: "Home",
    blocks: () => [
      { ...createBlock("chapter"), title: "Selected work", subtitle: "", number: "", spacingTop: "xl", spacingBottom: "m" } as ReturnType<typeof createBlock>,
      createBlock("project-list"),
    ],
  },
  archive: { title: "Archive", blocks: () => [createBlock("photo-archive")] },
  about: {
    title: "About",
    blocks: () => [
      { ...createBlock("text"), variant: "lead", content: "Photographer. Write a short biography here from the admin.", span: 7, start: 1 } as ReturnType<typeof createBlock>,
    ],
  },
};

export async function ensurePages() {
  const db = await getDb();
  const existing = await db.select({ slug: schema.pages.slug }).from(schema.pages);
  const have = new Set(existing.map((e) => e.slug));
  for (const slug of PAGE_SLUGS) {
    if (have.has(slug)) continue;
    const doc: BlocksDocument = { version: 1, blocks: DEFAULTS[slug].blocks() };
    await db
      .insert(schema.pages)
      .values({
        id: newId("pg"),
        slug,
        title: DEFAULTS[slug].title,
        previewToken: token(),
        draft: doc,
        published: { meta: { title: DEFAULTS[slug].title, seoTitle: "", seoDescription: "", ogPhotoId: null, settings: {} }, document: doc, publishedAt: new Date().toISOString() },
        publishedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}

export async function listPages() {
  await ensurePages();
  const db = await getDb();
  const rows = await db.select().from(schema.pages);
  const order = PAGE_SLUGS as readonly string[];
  return rows
    .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug))
    .map((r) => ({ ...r, hasUnpublished: hasUnpublishedChanges({ ...r, status: "published" }) }));
}

export async function getPage(slug: string) {
  await ensurePages();
  const db = await getDb();
  const [row] = await db.select().from(schema.pages).where(eq(schema.pages.slug, slug));
  return row ?? null;
}

export async function getPageById(pid: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.pages).where(eq(schema.pages.id, pid));
  return row ?? null;
}

export function pageMeta(p: Page): PageMeta {
  return { title: p.title, seoTitle: p.seoTitle, seoDescription: p.seoDescription, ogPhotoId: p.ogPhotoId, settings: p.settings };
}

export type PagePatch = Partial<Pick<Page, "title" | "seoTitle" | "seoDescription" | "ogPhotoId" | "settings">>;

export async function updatePageMeta(pid: string, patch: PagePatch) {
  const db = await getDb();
  const [row] = await db
    .update(schema.pages)
    .set({ ...patch, updatedAt: new Date(), draftUpdatedAt: new Date() })
    .where(eq(schema.pages.id, pid))
    .returning();
  if (!row) throw new Error("Page not found");
  return row;
}

export async function savePageDraft(pid: string, document: unknown) {
  const db = await getDb();
  const [row] = await db
    .update(schema.pages)
    .set({ draft: parseDocument(document), draftUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.pages.id, pid))
    .returning();
  if (!row) throw new Error("Page not found");
  return row;
}

export async function publishPage(pid: string) {
  const db = await getDb();
  const p = await getPageById(pid);
  if (!p) throw new Error("Page not found");
  const now = new Date();
  const snapshot = { meta: pageMeta(p), document: p.draft, publishedAt: now.toISOString() };
  await db
    .update(schema.pages)
    .set({ published: snapshot, publishedAt: now, updatedAt: now, draftUpdatedAt: now })
    .where(eq(schema.pages.id, pid));
  await addVersion("page", pid, "publish", "Published", p.draft, snapshot.meta as unknown as Record<string, unknown>);
  return getPageById(pid);
}

export async function getPublishedPage(slug: string) {
  const p = await getPage(slug);
  if (!p?.published) return null;
  return { id: p.id, slug: p.slug, ...p.published };
}
