import type { BlocksDocument } from "@/lib/blocks/schema";
import { z } from "zod";

/**
 * Content lives as JSON files in the repository (see paths.ts). The admin
 * writes them through the GitHub API; the static build reads them from disk.
 */

export const photoRecordSchema = z.object({
  id: z.string(),
  filename: z.string(),
  ext: z.string(), // jpg | png | webp | avif
  mime: z.string(),
  bytes: z.number(),
  width: z.number(),
  height: z.number(),
  aspectRatio: z.number(),
  orientation: z.enum(["landscape", "portrait", "square"]),
  dominantColor: z.string().default("#888888"),
  lqip: z.string().default(""),
  /** git blob sha of the original — changes when the file is replaced */
  originalSha: z.string().default(""),
  title: z.string().default(""),
  description: z.string().default(""),
  alt: z.string().default(""),
  altSuggested: z.boolean().default(false),
  year: z.string().default(""),
  location: z.string().default(""),
  camera: z.string().default(""),
  lens: z.string().default(""),
  categoryId: z.string().nullable().default(null),
  projectId: z.string().nullable().default(null),
  hidden: z.boolean().default(false),
  featured: z.boolean().default(false),
  showOnHome: z.boolean().default(false),
  showInArchive: z.boolean().default(true),
  archiveOrder: z.number().default(0),
  focalX: z.number().default(0.5),
  focalY: z.number().default(0.5),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PhotoRecord = z.infer<typeof photoRecordSchema>;

export const photosFileSchema = z.object({ photos: z.array(photoRecordSchema).default([]) });

export const categorySchema = z.object({ id: z.string(), name: z.string(), slug: z.string(), sortOrder: z.number().default(0) });
export type Category = z.infer<typeof categorySchema>;
export const categoriesFileSchema = z.object({ categories: z.array(categorySchema).default([]) });

export const projectMetaSchema = z.object({
  name: z.string(),
  slug: z.string(),
  year: z.string().default(""),
  location: z.string().default(""),
  description: z.string().default(""),
  coverPhotoId: z.string().nullable().default(null),
  categoryId: z.string().nullable().default(null),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  ogPhotoId: z.string().nullable().default(null),
});
export type ProjectMeta = z.infer<typeof projectMetaSchema>;

const documentSchema = z.custom<BlocksDocument>((v) => typeof v === "object" && v !== null && Array.isArray((v as BlocksDocument).blocks));

export const snapshotSchema = z.object({ meta: projectMetaSchema, document: documentSchema, publishedAt: z.string() });
export type ProjectSnapshot = z.infer<typeof snapshotSchema>;

/** content/projects/<id>/project.json — everything the public site needs. */
export const projectFileSchema = z.object({
  id: z.string(),
  slug: z.string(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  sortOrder: z.number().default(0),
  featured: z.boolean().default(false),
  showOnHome: z.boolean().default(true),
  showInArchive: z.boolean().default(true),
  photoIds: z.array(z.string()).default([]),
  published: snapshotSchema.nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectFile = z.infer<typeof projectFileSchema>;

/** content/projects/<id>/draft.json — the working copy. */
export const projectDraftSchema = z.object({
  meta: projectMetaSchema,
  document: documentSchema,
  draftUpdatedAt: z.string(),
});
export type ProjectDraft = z.infer<typeof projectDraftSchema>;

export const pageMetaSchema = z.object({
  title: z.string(),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  ogPhotoId: z.string().nullable().default(null),
});
export type PageMeta = z.infer<typeof pageMetaSchema>;
export const pageSnapshotSchema = z.object({ meta: pageMetaSchema, document: documentSchema, publishedAt: z.string() });
export const pageFileSchema = z.object({
  slug: z.string(),
  published: pageSnapshotSchema.nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  updatedAt: z.string(),
});
export type PageFile = z.infer<typeof pageFileSchema>;
export const pageDraftSchema = z.object({ meta: pageMetaSchema, document: documentSchema, draftUpdatedAt: z.string() });
export type PageDraft = z.infer<typeof pageDraftSchema>;

export const siteSettingsSchema = z.object({
  siteName: z.string().default("Portfolio"),
  tagline: z.string().default("Photography"),
  authorName: z.string().default(""),
  email: z.string().default(""),
  instagram: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  footerText: z.string().default(""),
  nav: z.array(z.object({ label: z.string(), href: z.string() })).default([
    { label: "Work", href: "/" },
    { label: "Archive", href: "/archive" },
    { label: "About", href: "/about" },
  ]),
  theme: z.enum(["paper", "white"]).default("paper"),
  /** Downscale uploads in the browser to this many px on the long edge (0 = keep original). */
  uploadMaxPx: z.number().default(0),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const PAGE_SLUGS = ["home", "archive", "about"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

/** public/media/manifest.json — produced by scripts/process-images.ts */
export type MediaVariant = { width: number; height: number; format: "avif" | "webp" | "jpeg"; file: string; bytes: number };
export type MediaManifest = Record<string, { sha: string; variants: MediaVariant[] }>;

export function hasUnpublished(draftUpdatedAt: string, publishedAt: string | null) {
  if (!publishedAt) return true;
  return new Date(draftUpdatedAt).getTime() > new Date(publishedAt).getTime() + 1000;
}
