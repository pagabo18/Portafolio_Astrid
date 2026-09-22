import {
  newId,
  newSlot,
  type Block,
  type BlockType,
  type GroupLayout,
  type ImageGroupBlock,
  type ImageBlock,
  type ImageSlot,
  type SingleLayout,
  imageBlockSchema,
  imageGroupBlockSchema,
  textBlockSchema,
  textImageBlockSchema,
  spacerBlockSchema,
  chapterBlockSchema,
  projectHeaderBlockSchema,
  projectListBlockSchema,
  photoArchiveBlockSchema,
} from "./schema";

/**
 * Layout library. Each template describes how slots sit on the 12 column
 * grid. Applying a template rewrites span/start of the slots but keeps the
 * photo, caption and metadata of each slot intact.
 */

export type LayoutInfo = {
  id: SingleLayout | GroupLayout;
  number: string;
  name: string;
  description: string;
  kind: "single" | "group";
  slots: number; // 0 = any
  /** ascii preview used in the picker */
  sketch: string[];
};

export const SINGLE_LAYOUT_INFO: Record<SingleLayout, LayoutInfo> = {
  "single-centered": { id: "single-centered", number: "01", name: "Single centered", description: "One photograph centered on the page.", kind: "single", slots: 1, sketch: ["    ████    "] },
  "single-left": { id: "single-left", number: "02", name: "Single left", description: "One photograph aligned to the left margin.", kind: "single", slots: 1, sketch: ["████        "] },
  "single-right": { id: "single-right", number: "03", name: "Single right", description: "One photograph aligned to the right margin.", kind: "single", slots: 1, sketch: ["        ████"] },
  "full-width": { id: "full-width", number: "04", name: "Full width", description: "Spans the whole content column.", kind: "single", slots: 1, sketch: ["████████████"] },
  hero: { id: "hero", number: "11", name: "Hero", description: "Large opening image, tall crop.", kind: "single", slots: 1, sketch: ["████████████", "████████████"] },
  panoramic: { id: "panoramic", number: "15", name: "Panoramic", description: "Wide cinematic crop.", kind: "single", slots: 1, sketch: ["▄▄▄▄▄▄▄▄▄▄▄▄"] },
  "full-bleed": { id: "full-bleed", number: "16", name: "Full bleed", description: "Edge to edge, ignores the page margins.", kind: "single", slots: 1, sketch: ["▐██████████▌"] },
};

export const GROUP_LAYOUT_INFO: Record<GroupLayout, LayoutInfo> = {
  "two-columns": { id: "two-columns", number: "05", name: "Two columns", description: "Two photographs side by side.", kind: "group", slots: 2, sketch: ["█████  █████"] },
  "large-small": { id: "large-small", number: "06", name: "Large + small", description: "A dominant image with a smaller companion.", kind: "group", slots: 2, sketch: ["███████  ███"] },
  "small-large": { id: "small-large", number: "07", name: "Small + large", description: "Small companion followed by the dominant image.", kind: "group", slots: 2, sketch: ["███  ███████"] },
  "vertical-pair": { id: "vertical-pair", number: "08", name: "Vertical pair", description: "Two stacked photographs, offset.", kind: "group", slots: 2, sketch: ["  █████     ", "     █████  "] },
  "horizontal-pair": { id: "horizontal-pair", number: "09", name: "Horizontal pair", description: "Two landscape photographs, bottom aligned.", kind: "group", slots: 2, sketch: ["▄▄▄▄▄  ▄▄▄▄▄"] },
  triptych: { id: "triptych", number: "10", name: "Triptych", description: "Three photographs in a row.", kind: "group", slots: 3, sketch: ["███ ███ ███ "] },
  "editorial-offset": { id: "editorial-offset", number: "14", name: "Editorial offset", description: "Asymmetric pair with vertical displacement.", kind: "group", slots: 2, sketch: ["██████      ", "       █████"] },
  spread: { id: "spread", number: "17", name: "Spread", description: "Two halves like a book spread, no gutter.", kind: "group", slots: 2, sketch: ["██████▏█████"] },
  grid: { id: "grid", number: "20a", name: "Grid", description: "Equal cells, wraps automatically.", kind: "group", slots: 0, sketch: ["███ ███ ███ ", "███ ███ ███ "] },
  sequence: { id: "sequence", number: "20b", name: "Sequence", description: "Small photographs in a strip.", kind: "group", slots: 0, sketch: ["██ ██ ██ ██ "] },
  custom: { id: "custom", number: "20", name: "Custom editorial group", description: "Free placement of each photo on the grid.", kind: "group", slots: 0, sketch: ["  ████      ", "      █████ "] },
};

export const LAYOUT_LIBRARY: LayoutInfo[] = [
  ...Object.values(SINGLE_LAYOUT_INFO),
  ...Object.values(GROUP_LAYOUT_INFO),
].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

type SlotPreset = Partial<Pick<ImageSlot, "span" | "start" | "offsetX" | "offsetY" | "vAlign" | "fit" | "aspect">>;

export const SINGLE_PRESETS: Record<SingleLayout, SlotPreset> = {
  "single-centered": { span: 8, start: 3, fit: "contain", aspect: "auto", offsetY: 0 },
  "single-left": { span: 7, start: 1, fit: "contain", aspect: "auto" },
  "single-right": { span: 7, start: 6, fit: "contain", aspect: "auto" },
  "full-width": { span: 12, start: 1, fit: "contain", aspect: "auto" },
  hero: { span: 12, start: 1, fit: "cover", aspect: "16:9" },
  panoramic: { span: 12, start: 1, fit: "cover", aspect: "21:9" },
  "full-bleed": { span: 12, start: 1, fit: "cover", aspect: "auto" },
};

export const GROUP_PRESETS: Record<GroupLayout, (i: number, n: number) => SlotPreset> = {
  "two-columns": () => ({ span: 6, start: "auto", vAlign: "top" }),
  "large-small": (i) => (i === 0 ? { span: 8, start: 1, vAlign: "top" } : { span: 4, start: 9, vAlign: "bottom" }),
  "small-large": (i) => (i === 0 ? { span: 4, start: 1, vAlign: "bottom" } : { span: 8, start: 5, vAlign: "top" }),
  "vertical-pair": (i) => (i === 0 ? { span: 5, start: 2, vAlign: "top" } : { span: 5, start: 7, vAlign: "top", offsetY: 3 }),
  "horizontal-pair": () => ({ span: 6, start: "auto", vAlign: "bottom" }),
  triptych: () => ({ span: 4, start: "auto", vAlign: "center" }),
  "editorial-offset": (i) => (i === 0 ? { span: 6, start: 1, vAlign: "top" } : { span: 5, start: 8, vAlign: "top", offsetY: 4 }),
  spread: () => ({ span: 6, start: "auto", fit: "cover", aspect: "4:5", vAlign: "top" }),
  grid: (_i, n) => ({ span: n >= 4 ? 3 : n === 3 ? 4 : 6, start: "auto", fit: "cover", aspect: "1:1" }),
  sequence: () => ({ span: 3, start: "auto", fit: "contain", vAlign: "center" }),
  custom: (i) => ({ span: 5, start: i % 2 === 0 ? 1 : 7, offsetY: i % 2 === 0 ? 0 : 2 }),
};

export function applySingleLayout(block: ImageBlock, layout: SingleLayout): ImageBlock {
  const preset = SINGLE_PRESETS[layout];
  return { ...block, layout, image: { ...block.image, ...preset } };
}

export function applyGroupLayout(block: ImageGroupBlock, layout: GroupLayout): ImageGroupBlock {
  const n = block.images.length;
  const images = block.images.map((s, i) => ({ ...s, ...GROUP_PRESETS[layout](i, n), offsetX: 0, offsetY: GROUP_PRESETS[layout](i, n).offsetY ?? 0 }));
  return { ...block, layout, gap: layout === "spread" ? "none" : block.gap, images };
}

/* ------------------------------------------------------------------ */
/* Block factories                                                      */
/* ------------------------------------------------------------------ */

export const BLOCK_TYPE_INFO: { type: BlockType; name: string; description: string; scope: ("project" | "page")[] }[] = [
  { type: "project-header", name: "Project header", description: "Title, year, location and description.", scope: ["project"] },
  { type: "image", name: "Image", description: "A single photograph with a layout.", scope: ["project", "page"] },
  { type: "image-group", name: "Image group", description: "Pair, triptych, grid or custom group.", scope: ["project", "page"] },
  { type: "text", name: "Text", description: "Editorial paragraph or quote.", scope: ["project", "page"] },
  { type: "text-image", name: "Text + photo", description: "A column of text next to a photograph.", scope: ["project", "page"] },
  { type: "chapter", name: "Title / chapter", description: "Numbered chapter opener.", scope: ["project", "page"] },
  { type: "spacer", name: "Spacer", description: "An editorial pause.", scope: ["project", "page"] },
  { type: "project-list", name: "Project list", description: "List of projects (home).", scope: ["page"] },
  { type: "photo-archive", name: "Photo archive", description: "Filterable photo grid (archive).", scope: ["page"] },
];

export function createBlock(type: BlockType, opts: { photoIds?: string[]; layout?: string } = {}): Block {
  const id = newId("b");
  const photoIds = opts.photoIds ?? [];
  switch (type) {
    case "image": {
      const layout = (opts.layout as SingleLayout) ?? "single-centered";
      const b = imageBlockSchema.parse({ id, type, layout, image: newSlot({ photoId: photoIds[0] ?? null }) });
      return applySingleLayout(b, layout);
    }
    case "image-group": {
      const layout = (opts.layout as GroupLayout) ?? "two-columns";
      const n = photoIds.length || GROUP_LAYOUT_INFO[layout].slots || 2;
      const images = Array.from({ length: n }, (_, i) => newSlot({ photoId: photoIds[i] ?? null }));
      const b = imageGroupBlockSchema.parse({ id, type, layout, images });
      return applyGroupLayout(b, layout);
    }
    case "text":
      return textBlockSchema.parse({ id, type, content: "" });
    case "text-image":
      return textImageBlockSchema.parse({ id, type, image: newSlot({ photoId: photoIds[0] ?? null, span: 7 }) });
    case "spacer":
      return spacerBlockSchema.parse({ id, type, spacingTop: "none", spacingBottom: "none" });
    case "chapter":
      return chapterBlockSchema.parse({ id, type, spacingTop: "xl", spacingBottom: "l" });
    case "project-header":
      return projectHeaderBlockSchema.parse({ id, type, spacingTop: "l", spacingBottom: "xl" });
    case "project-list":
      return projectListBlockSchema.parse({ id, type });
    case "photo-archive":
      return photoArchiveBlockSchema.parse({ id, type });
  }
}

/** Deep-copy a block with fresh ids (for Duplicate). */
export function duplicateBlock(block: Block): Block {
  const copy: Block = JSON.parse(JSON.stringify(block));
  copy.id = newId("b");
  if (copy.type === "image" || copy.type === "text-image") copy.image.id = newId("s");
  if (copy.type === "image-group") copy.images = copy.images.map((s) => ({ ...s, id: newId("s") }));
  return copy;
}

/* ------------------------------------------------------------------ */
/* Automatic first proposal                                             */
/* ------------------------------------------------------------------ */

export type ComposablePhoto = { id: string; aspectRatio: number; orientation: string; dominantColor?: string };

/**
 * Build a first editorial proposal from a set of photos using aspect ratio,
 * orientation and tonal similarity. Everything it produces is ordinary
 * blocks the admin can rearrange.
 */
export function autoCompose(photos: ComposablePhoto[], opts: { header?: boolean } = {}): Block[] {
  const blocks: Block[] = [];
  if (opts.header !== false) blocks.push(createBlock("project-header"));
  if (!photos.length) return blocks;

  const queue = [...photos];
  let i = 0;
  const lum = (hex?: string) => {
    if (!hex) return 0.5;
    const n = parseInt(hex.slice(1), 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  };

  // Opening: the widest landscape becomes the hero.
  const heroIdx = queue.findIndex((p) => p.aspectRatio >= 1.3);
  const hero = heroIdx >= 0 ? queue.splice(heroIdx, 1)[0] : queue.shift()!;
  blocks.push(createBlock("image", { photoIds: [hero.id], layout: hero.aspectRatio >= 1.9 ? "panoramic" : "full-width" }));

  while (queue.length) {
    const a = queue.shift()!;
    const isPortrait = a.aspectRatio < 0.95;
    // find a partner with similar orientation and tone
    const partnerIdx = queue.findIndex(
      (p) => (p.aspectRatio < 0.95) === isPortrait && Math.abs(lum(p.dominantColor) - lum(a.dominantColor)) < 0.35,
    );
    const cycle = i++ % 5;

    if (isPortrait && partnerIdx >= 0 && cycle !== 4) {
      const b = queue.splice(partnerIdx, 1)[0];
      const third = queue.findIndex((p) => p.aspectRatio < 0.95);
      if (cycle === 2 && third >= 0) {
        const c = queue.splice(third, 1)[0];
        blocks.push(createBlock("image-group", { photoIds: [a.id, b.id, c.id], layout: "triptych" }));
      } else {
        blocks.push(createBlock("image-group", { photoIds: [a.id, b.id], layout: cycle === 1 ? "editorial-offset" : cycle === 3 ? "vertical-pair" : "two-columns" }));
      }
      continue;
    }
    if (!isPortrait && partnerIdx >= 0 && cycle === 1) {
      const b = queue.splice(partnerIdx, 1)[0];
      blocks.push(createBlock("image-group", { photoIds: [a.id, b.id], layout: "horizontal-pair" }));
      continue;
    }
    if (!isPortrait && cycle === 3) {
      const small = queue.findIndex((p) => p.aspectRatio < 0.95);
      if (small >= 0) {
        const b = queue.splice(small, 1)[0];
        blocks.push(createBlock("image-group", { photoIds: [a.id, b.id], layout: "large-small" }));
        continue;
      }
    }
    // single
    const layout: SingleLayout = isPortrait
      ? (["single-centered", "single-left", "single-right"] as const)[cycle % 3]
      : cycle === 0
        ? "full-width"
        : cycle % 2 === 0
          ? "single-right"
          : "single-left";
    blocks.push(createBlock("image", { photoIds: [a.id], layout }));
    if (cycle === 4) blocks.push(createBlock("spacer"));
  }
  return blocks;
}

export const spacingLabel: Record<string, string> = { none: "None", xs: "XS", s: "S", m: "M", l: "L", xl: "XL", xxl: "XXL" };
