import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { BlocksDocument } from "@/lib/blocks/schema";

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").default("").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  userAgent: text("user_agent").default(""),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => [uniqueIndex("categories_slug_idx").on(t.slug)]);

export type PhotoVariant = {
  width: number;
  height: number;
  format: "avif" | "webp" | "jpeg";
  path: string;
  bytes: number;
};

export const photos = pgTable("photos", {
  id: text("id").primaryKey(),
  /** Original file name as uploaded. */
  filename: text("filename").notNull(),
  /** Storage path of the untouched original. */
  originalPath: text("original_path").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  /** width / height */
  aspectRatio: real("aspect_ratio").notNull(),
  orientation: text("orientation").notNull(), // landscape | portrait | square
  dominantColor: text("dominant_color").default("#888888").notNull(),
  /** Tiny base64 preview for progressive loading. */
  lqip: text("lqip").default("").notNull(),
  variants: jsonb("variants").$type<PhotoVariant[]>().default([]).notNull(),
  thumbPath: text("thumb_path").notNull(),

  // metadata (all optional)
  title: text("title").default("").notNull(),
  description: text("description").default("").notNull(),
  alt: text("alt").default("").notNull(),
  altSuggested: boolean("alt_suggested").default(false).notNull(),
  year: text("year").default("").notNull(),
  location: text("location").default("").notNull(),
  camera: text("camera").default("").notNull(),
  lens: text("lens").default("").notNull(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  /** Primary project (a photo may still be *placed* in other projects). */
  projectId: text("project_id"),

  // visibility flags
  hidden: boolean("hidden").default(false).notNull(),
  featured: boolean("featured").default(false).notNull(),
  showOnHome: boolean("show_on_home").default(false).notNull(),
  showInArchive: boolean("show_in_archive").default(true).notNull(),
  archiveOrder: integer("archive_order").default(0).notNull(),

  // focal point (0..1) for object-position when cropping
  focalX: real("focal_x").default(0.5).notNull(),
  focalY: real("focal_y").default(0.5).notNull(),

  exif: jsonb("exif").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("photos_project_idx").on(t.projectId),
  index("photos_category_idx").on(t.categoryId),
  index("photos_created_idx").on(t.createdAt),
]);

export type ProjectMeta = {
  name: string;
  slug: string;
  year: string;
  location: string;
  description: string;
  coverPhotoId: string | null;
  categoryId: string | null;
  seoTitle: string;
  seoDescription: string;
  ogPhotoId: string | null;
};

export type PublishedSnapshot<M> = {
  meta: M;
  document: BlocksDocument;
  publishedAt: string;
};

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  year: text("year").default("").notNull(),
  location: text("location").default("").notNull(),
  description: text("description").default("").notNull(),
  coverPhotoId: text("cover_photo_id"),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  /** draft | published | archived (archived == hidden everywhere) */
  status: text("status").default("draft").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  featured: boolean("featured").default(false).notNull(),
  showOnHome: boolean("show_on_home").default(true).notNull(),
  showInArchive: boolean("show_in_archive").default(true).notNull(),
  seoTitle: text("seo_title").default("").notNull(),
  seoDescription: text("seo_description").default("").notNull(),
  ogPhotoId: text("og_photo_id"),
  previewToken: text("preview_token").notNull(),

  /** Working copy of the page layout. */
  draft: jsonb("draft").$type<BlocksDocument>().default({ version: 1, blocks: [] }).notNull(),
  draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }).defaultNow().notNull(),
  /** Everything the public site reads. */
  published: jsonb("published").$type<PublishedSnapshot<ProjectMeta> | null>(),
  publishedAt: timestamp("published_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("projects_slug_idx").on(t.slug), index("projects_order_idx").on(t.sortOrder)]);

/** Membership: which photos belong to a project (ordered). */
export const projectPhotos = pgTable("project_photos", {
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  photoId: text("photo_id").notNull().references(() => photos.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => [primaryKey({ columns: [t.projectId, t.photoId] })]);

export type PageMeta = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  ogPhotoId: string | null;
  settings: Record<string, unknown>;
};

/** Static pages: home, archive, about (block based as well). */
export const pages = pgTable("pages", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(), // home | archive | about
  title: text("title").notNull(),
  seoTitle: text("seo_title").default("").notNull(),
  seoDescription: text("seo_description").default("").notNull(),
  ogPhotoId: text("og_photo_id"),
  /** Page-specific settings (e.g. archive filters). */
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  previewToken: text("preview_token").notNull(),
  draft: jsonb("draft").$type<BlocksDocument>().default({ version: 1, blocks: [] }).notNull(),
  draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true }).defaultNow().notNull(),
  published: jsonb("published").$type<PublishedSnapshot<PageMeta> | null>(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("pages_slug_idx").on(t.slug)]);

/** Simple version history for projects & pages. */
export const versions = pgTable("versions", {
  id: text("id").primaryKey(),
  targetType: text("target_type").notNull(), // project | page
  targetId: text("target_id").notNull(),
  kind: text("kind").notNull(), // publish | snapshot | restore
  label: text("label").default("").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
  document: jsonb("document").$type<BlocksDocument>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("versions_target_idx").on(t.targetType, t.targetId, t.createdAt)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* relations (for convenience queries) */
export const photosRelations = relations(photos, ({ one }) => ({
  category: one(categories, { fields: [photos.categoryId], references: [categories.id] }),
}));
export const projectsRelations = relations(projects, ({ many, one }) => ({
  photos: many(projectPhotos),
  category: one(categories, { fields: [projects.categoryId], references: [categories.id] }),
}));
export const projectPhotosRelations = relations(projectPhotos, ({ one }) => ({
  project: one(projects, { fields: [projectPhotos.projectId], references: [projects.id] }),
  photo: one(photos, { fields: [projectPhotos.photoId], references: [photos.id] }),
}));

export type User = typeof users.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Version = typeof versions.$inferSelect;
export const now = sql`now()`;
