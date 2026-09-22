/** Client-safe photo representation used by the renderer and the admin UI. */
export type PhotoSource = { width: number; height: number; url: string };

export type PhotoView = {
  id: string;
  filename: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: string;
  bytes: number;
  mime: string;
  title: string;
  description: string;
  alt: string;
  altSuggested: boolean;
  year: string;
  location: string;
  camera: string;
  lens: string;
  categoryId: string | null;
  categoryName: string;
  projectId: string | null;
  hidden: boolean;
  featured: boolean;
  showOnHome: boolean;
  showInArchive: boolean;
  archiveOrder: number;
  focalX: number;
  focalY: number;
  lqip: string;
  dominantColor: string;
  thumbUrl: string;
  originalUrl: string;
  sources: { avif: PhotoSource[]; webp: PhotoSource[]; jpeg: PhotoSource[] };
  createdAt: string;
};

export type PhotoMap = Record<string, PhotoView>;

/** Best fallback URL (largest jpeg, else webp, else original). */
export function fallbackUrl(p: PhotoView) {
  const j = p.sources.jpeg.at(-1);
  if (j) return j.url;
  const w = p.sources.webp.at(-1);
  if (w) return w.url;
  return p.originalUrl;
}

export function srcset(list: PhotoSource[]) {
  return list.map((s) => `${s.url} ${s.width}w`).join(", ");
}
