import { z } from "zod";

/**
 * Editorial block model.
 *
 * Everything the admin edits visually is stored as a JSON document made of
 * blocks. Photos are referenced by id only – the same photo can appear in many
 * places with different presentation settings (content vs presentation).
 *
 * Grid: 12 columns on desktop. Slots use `span` (1..12) and `start`
 * (1..12 or "auto"). Offsets are in grid units, never pixels.
 */

export const SPACING = ["none", "xs", "s", "m", "l", "xl", "xxl"] as const;
export const spacingSchema = z.enum(SPACING);
export type Spacing = z.infer<typeof spacingSchema>;

export const BACKGROUNDS = ["default", "offwhite", "black"] as const;
export const backgroundSchema = z.enum(BACKGROUNDS);
export type Background = z.infer<typeof backgroundSchema>;

export const ASPECTS = ["auto", "1:1", "4:5", "5:4", "3:2", "2:3", "4:3", "3:4", "16:9", "21:9", "2:1", "3:1"] as const;
export const aspectSchema = z.enum(ASPECTS);
export type Aspect = z.infer<typeof aspectSchema>;

export const H_ALIGN = ["left", "center", "right"] as const;
export const V_ALIGN = ["top", "center", "bottom"] as const;

export const startSchema = z.union([z.literal("auto"), z.number().int().min(1).max(12)]);
export const spanSchema = z.number().int().min(1).max(12);
export const offsetSchema = z.number().int().min(-4).max(4);

/** Per-breakpoint override. Everything optional: "auto" is the default. */
export const slotOverrideSchema = z.object({
  span: spanSchema.optional(),
  start: startSchema.optional(),
  offsetX: offsetSchema.optional(),
  offsetY: offsetSchema.optional(),
  hidden: z.boolean().optional(),
});
export type SlotOverride = z.infer<typeof slotOverrideSchema>;

export const captionSchema = z.object({
  show: z.boolean().default(false),
  title: z.boolean().default(true),
  location: z.boolean().default(true),
  year: z.boolean().default(true),
  index: z.boolean().default(false),
  caption: z.boolean().default(true),
  metadata: z.boolean().default(false), // camera / lens
  text: z.string().default(""), // per-instance caption override
  align: z.enum(H_ALIGN).default("left"),
});
export type CaptionSettings = z.infer<typeof captionSchema>;

/** A photo placed on the grid. */
export const imageSlotSchema = z.object({
  id: z.string(),
  photoId: z.string().nullable().default(null),
  span: spanSchema.default(6),
  start: startSchema.default("auto"),
  offsetX: offsetSchema.default(0),
  offsetY: offsetSchema.default(0),
  vAlign: z.enum(V_ALIGN).default("top"),
  fit: z.enum(["contain", "cover"]).default("contain"),
  aspect: aspectSchema.default("auto"),
  /** Presentation-only transforms. Never touch the file. */
  rotation: z.number().min(-180).max(180).default(0),
  scale: z.number().min(0.5).max(2).default(1),
  /** Advanced: overlap neighbours. */
  overlap: z.boolean().default(false),
  zIndex: z.number().int().min(0).max(10).default(0),
  fullscreen: z.boolean().default(true),
  visible: z.boolean().default(true),
  caption: captionSchema.default(() => captionSchema.parse({})),
  /** Optional per-instance focal point override (0..1). Falls back to photo. */
  focal: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).nullable().default(null),
  responsive: z
    .object({ tablet: slotOverrideSchema.optional(), mobile: slotOverrideSchema.optional() })
    .default({}),
});
export type ImageSlot = z.infer<typeof imageSlotSchema>;

const base = {
  id: z.string(),
  visible: z.boolean().default(true),
  spacingTop: spacingSchema.default("m"),
  spacingBottom: spacingSchema.default("m"),
  background: backgroundSchema.default("default"),
  label: z.string().default(""),
};

export const SINGLE_LAYOUTS = [
  "single-centered",
  "single-left",
  "single-right",
  "full-width",
  "full-bleed",
  "hero",
  "panoramic",
] as const;
export type SingleLayout = (typeof SINGLE_LAYOUTS)[number];

export const GROUP_LAYOUTS = [
  "two-columns",
  "large-small",
  "small-large",
  "vertical-pair",
  "horizontal-pair",
  "triptych",
  "editorial-offset",
  "spread",
  "grid",
  "sequence",
  "custom",
] as const;
export type GroupLayout = (typeof GROUP_LAYOUTS)[number];

export const imageBlockSchema = z.object({
  ...base,
  type: z.literal("image"),
  layout: z.enum(SINGLE_LAYOUTS).default("single-centered"),
  image: imageSlotSchema,
});

export const imageGroupBlockSchema = z.object({
  ...base,
  type: z.literal("image-group"),
  layout: z.enum(GROUP_LAYOUTS).default("two-columns"),
  gap: spacingSchema.default("m"),
  images: z.array(imageSlotSchema).default([]),
});

export const textBlockSchema = z.object({
  ...base,
  type: z.literal("text"),
  variant: z.enum(["body", "lead", "quote", "small"]).default("body"),
  content: z.string().default(""),
  align: z.enum(H_ALIGN).default("left"),
  span: spanSchema.default(6),
  start: startSchema.default("auto"),
});

export const textImageBlockSchema = z.object({
  ...base,
  type: z.literal("text-image"),
  order: z.enum(["text-first", "image-first"]).default("text-first"),
  content: z.string().default(""),
  textSpan: spanSchema.default(4),
  image: imageSlotSchema,
  vAlign: z.enum(V_ALIGN).default("bottom"),
});

export const spacerBlockSchema = z.object({
  ...base,
  type: z.literal("spacer"),
  size: spacingSchema.default("xl"),
});

export const chapterBlockSchema = z.object({
  ...base,
  type: z.literal("chapter"),
  number: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  align: z.enum(H_ALIGN).default("left"),
});

export const projectHeaderBlockSchema = z.object({
  ...base,
  type: z.literal("project-header"),
  showTitle: z.boolean().default(true),
  showMeta: z.boolean().default(true), // year / location / category
  showDescription: z.boolean().default(true),
  showIndex: z.boolean().default(true),
  align: z.enum(H_ALIGN).default("left"),
});

/** Home / archive helper blocks */
export const projectListBlockSchema = z.object({
  ...base,
  type: z.literal("project-list"),
  source: z.enum(["home", "featured", "all", "manual"]).default("home"),
  projectIds: z.array(z.string()).default([]),
  style: z.enum(["editorial", "index", "grid"]).default("editorial"),
  showMeta: z.boolean().default(true),
  limit: z.number().int().min(0).max(100).default(0),
});

export const photoArchiveBlockSchema = z.object({
  ...base,
  type: z.literal("photo-archive"),
  columns: z.number().int().min(2).max(6).default(4),
  showFilters: z.boolean().default(true),
  showCaptions: z.boolean().default(true),
  sort: z.enum(["manual", "newest", "oldest", "year-desc", "year-asc", "title"]).default("manual"),
});

export const blockSchema = z.discriminatedUnion("type", [
  imageBlockSchema,
  imageGroupBlockSchema,
  textBlockSchema,
  textImageBlockSchema,
  spacerBlockSchema,
  chapterBlockSchema,
  projectHeaderBlockSchema,
  projectListBlockSchema,
  photoArchiveBlockSchema,
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type ImageGroupBlock = z.infer<typeof imageGroupBlockSchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type TextImageBlock = z.infer<typeof textImageBlockSchema>;
export type SpacerBlock = z.infer<typeof spacerBlockSchema>;
export type ChapterBlock = z.infer<typeof chapterBlockSchema>;
export type ProjectHeaderBlock = z.infer<typeof projectHeaderBlockSchema>;
export type ProjectListBlock = z.infer<typeof projectListBlockSchema>;
export type PhotoArchiveBlock = z.infer<typeof photoArchiveBlockSchema>;

export const blocksDocumentSchema = z.object({
  version: z.literal(1).default(1),
  blocks: z.array(blockSchema).default([]),
});
export type BlocksDocument = z.infer<typeof blocksDocumentSchema>;

export const emptyDocument = (): BlocksDocument => ({ version: 1, blocks: [] });

/** Parse an unknown value into a valid document, filling defaults. */
export function parseDocument(input: unknown): BlocksDocument {
  const res = blocksDocumentSchema.safeParse(input);
  if (res.success) return res.data;
  return emptyDocument();
}

export function newId(prefix = "b"): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export function newSlot(partial: Partial<ImageSlot> = {}): ImageSlot {
  return imageSlotSchema.parse({ id: newId("s"), ...partial });
}

/** Collect every photo id referenced by a document. */
export function collectPhotoIds(doc: BlocksDocument): string[] {
  const ids = new Set<string>();
  for (const b of doc.blocks) {
    if (b.type === "image" || b.type === "text-image") {
      if (b.image.photoId) ids.add(b.image.photoId);
    } else if (b.type === "image-group") {
      for (const s of b.images) if (s.photoId) ids.add(s.photoId);
    }
  }
  return [...ids];
}
