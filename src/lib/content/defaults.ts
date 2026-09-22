import { createBlock } from "@/lib/blocks/templates";
import type { BlocksDocument } from "@/lib/blocks/schema";
import type { PageDraft, PageFile, PageSlug, SiteSettings } from "./types";
import { siteSettingsSchema } from "./types";

export function defaultSite(): SiteSettings {
  return siteSettingsSchema.parse({});
}

export function defaultPageDocument(slug: PageSlug): BlocksDocument {
  switch (slug) {
    case "home":
      return { version: 1, blocks: [{ ...createBlock("chapter"), title: "Selected work", spacingTop: "xl", spacingBottom: "m" } as ReturnType<typeof createBlock>, createBlock("project-list")] };
    case "archive":
      return { version: 1, blocks: [createBlock("photo-archive")] };
    case "about":
      return { version: 1, blocks: [{ ...createBlock("text"), variant: "lead", content: "Photographer. Write a short biography here from the admin.", span: 7, start: 1 } as ReturnType<typeof createBlock>] };
  }
}

export const PAGE_TITLES: Record<PageSlug, string> = { home: "Home", archive: "Archive", about: "About" };

export function defaultPage(slug: PageSlug, now = new Date().toISOString()): { file: PageFile; draft: PageDraft } {
  const document = defaultPageDocument(slug);
  const meta = { title: PAGE_TITLES[slug], seoTitle: "", seoDescription: "", ogPhotoId: null };
  return {
    file: { slug, published: { meta, document, publishedAt: now }, publishedAt: now, updatedAt: now },
    draft: { meta, document, draftUpdatedAt: now },
  };
}
