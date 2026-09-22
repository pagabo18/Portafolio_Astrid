"use client";

import type { ImageSlot } from "@/lib/blocks/schema";
import type { PhotoView } from "@/lib/photos/view";

export function Caption({ slot, photo, index }: { slot: ImageSlot; photo: PhotoView; index?: number }) {
  const c = slot.caption;
  if (!c.show) return null;
  const lines: { key: string; text: string; cls?: string }[] = [];
  if (c.index && index !== undefined) lines.push({ key: "i", text: String(index + 1).padStart(3, "0"), cls: "ed-cap-index" });
  if (c.title && photo.title) lines.push({ key: "t", text: photo.title, cls: "ed-cap-title" });
  const meta = [c.location ? photo.location : "", c.year ? photo.year : ""].filter(Boolean).join(", ");
  if (meta) lines.push({ key: "m", text: meta });
  const text = c.text || (c.caption ? photo.description : "");
  if (text) lines.push({ key: "c", text });
  if (c.metadata) {
    const gear = [photo.camera, photo.lens].filter(Boolean).join(" · ");
    if (gear) lines.push({ key: "g", text: gear });
  }
  if (!lines.length) return null;
  return (
    <figcaption className="ed-caption" data-align={c.align}>
      {lines.map((l) => (
        <span key={l.key} className={l.cls}>
          {l.text}
        </span>
      ))}
    </figcaption>
  );
}
