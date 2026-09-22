import type { PhotoView } from "@/lib/photos/view";
import type { Category, MediaManifest, PhotoRecord } from "./types";

/**
 * Build the client-safe PhotoView used by the renderer.
 *  - Public build: URLs point at /media/photos/<id>/… produced by the image script.
 *  - Admin: URLs point at the repository (raw) preview/thumb until the site is built.
 */
export function photoView(
  p: PhotoRecord,
  opts: { manifest?: MediaManifest; categories?: Category[]; mediaBase?: string; rawBase?: string },
): PhotoView {
  const cat = opts.categories?.find((c) => c.id === p.categoryId);
  const m = opts.manifest?.[p.id];
  const mediaBase = opts.mediaBase ?? "/media";
  const by = (f: "avif" | "webp" | "jpeg") =>
    (m?.variants ?? [])
      .filter((v) => v.format === f)
      .sort((a, b) => a.width - b.width)
      .map((v) => ({ width: v.width, height: v.height, url: `${mediaBase}/photos/${p.id}/${v.file}` }));

  let thumbUrl = `${mediaBase}/photos/${p.id}/thumb.webp`;
  let previewUrl = `${mediaBase}/photos/${p.id}/preview.webp`;
  let originalUrl = `${mediaBase}/photos/${p.id}/original.${p.ext}`;
  if (opts.rawBase) {
    const v = `?v=${encodeURIComponent(p.updatedAt)}`;
    thumbUrl = `${opts.rawBase}/content/photos/${p.id}/thumb.webp${v}`;
    previewUrl = `${opts.rawBase}/content/photos/${p.id}/preview.webp${v}`;
    originalUrl = `${opts.rawBase}/content/photos/${p.id}/original.${p.ext}${v}`;
  }
  const sources = m
    ? { avif: by("avif"), webp: by("webp"), jpeg: by("jpeg") }
    : { avif: [], webp: [{ width: Math.min(1600, p.width), height: Math.round(Math.min(1600, p.width) / p.aspectRatio), url: previewUrl }], jpeg: [] };

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
    categoryName: cat?.name ?? "",
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
    thumbUrl,
    originalUrl,
    sources,
    createdAt: p.createdAt,
  };
}
