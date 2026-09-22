"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PhotoArchiveBlock, ProjectListBlock } from "@/lib/blocks/schema";
import { newSlot } from "@/lib/blocks/schema";
import { EditorialImage } from "../EditorialImage";
import { useLightbox } from "../Lightbox";
import type { EditorHooks, RenderData } from "../types";

export function ProjectListBlockView({ block, data, editor }: { block: ProjectListBlock; data: RenderData; editor?: EditorHooks }) {
  let list = data.projects ?? [];
  if (block.source === "featured") list = list.filter((p) => p.featured);
  if (block.source === "manual") list = block.projectIds.map((id) => list.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);
  if (block.limit) list = list.slice(0, block.limit);
  const href = (s: string) => `${data.projectHrefBase ?? "/projects"}/${s}`;
  const slot = newSlot({ span: 12, fit: "cover", aspect: block.style === "grid" ? "4:5" : "3:2" });

  if (!list.length) {
    return editor ? <div className="ed-empty-slot">No published projects yet</div> : null;
  }

  if (block.style === "index") {
    return (
      <div className="ed-grid">
        <div className="ed-slot" style={{ "--span": "12" } as React.CSSProperties}>
          <ol className="divide-y hairline border-t border-b">
            {list.map((p, i) => (
              <li key={p.id}>
                <Link href={href(p.slug)} className="group grid grid-cols-12 items-baseline gap-4 py-5 transition hover:text-ink-2">
                  <span className="ed-chapter-number col-span-1">{String(i + 1).padStart(2, "0")}</span>
                  <span className="col-span-7 text-[clamp(18px,2cqw,30px)] font-light">{p.name}</span>
                  {block.showMeta ? <span className="eyebrow col-span-4 text-right">{[p.year, p.location].filter(Boolean).join(" — ")}</span> : null}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  if (block.style === "grid") {
    return (
      <div className="ed-grid" style={{ rowGap: "var(--sp-l)" }}>
        {list.map((p) => {
          const photo = p.coverPhotoId ? data.photos[p.coverPhotoId] : undefined;
          return (
            <div key={p.id} className="ed-slot" style={{ "--span": "4", "--span-md": "6", "--span-sm": "12" } as React.CSSProperties}>
              <Link href={href(p.slug)} className="block">
                {photo ? <EditorialImage photo={photo} slot={{ ...slot, span: 4 }} /> : <div className="ed-empty-slot">No cover</div>}
                <div className="ed-caption">
                  <span className="ed-cap-title">{p.name}</span>
                  {block.showMeta ? <span>{[p.year, p.location].filter(Boolean).join(", ")}</span> : null}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    );
  }

  // editorial: alternating large compositions
  return (
    <div className="ed-grid" style={{ rowGap: "var(--sp-xl)" }}>
      {list.map((p, i) => {
        const photo = p.coverPhotoId ? data.photos[p.coverPhotoId] : undefined;
        const patterns = [
          { span: 8, start: 1 },
          { span: 6, start: 7 },
          { span: 7, start: 3 },
          { span: 5, start: 1 },
        ];
        const pat = patterns[i % patterns.length];
        const isPortrait = photo ? photo.aspectRatio < 0.95 : false;
        const span = isPortrait ? Math.min(pat.span, 5) : pat.span;
        return (
          <div
            key={p.id}
            className="ed-slot"
            style={{ "--span": String(span), "--start": String(pat.start), "--span-md": String(Math.min(12, span + 2)), "--span-sm": "12" } as React.CSSProperties}
          >
            <Link href={href(p.slug)} className="group block">
              {photo ? <EditorialImage photo={photo} slot={{ ...newSlot({ span, aspect: "auto", fit: "contain" }) }} /> : <div className="ed-empty-slot">No cover</div>}
              <div className="mt-4 flex items-baseline justify-between gap-6">
                <div>
                  <span className="ed-chapter-number mr-4">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[clamp(16px,1.6cqw,24px)] font-light transition group-hover:opacity-60">{p.name}</span>
                </div>
                {block.showMeta ? <span className="eyebrow whitespace-nowrap">{[p.year, p.location].filter(Boolean).join(" — ")}</span> : null}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export function PhotoArchiveBlockView({ block, data, editor }: { block: PhotoArchiveBlock; data: RenderData; editor?: EditorHooks }) {
  const [cat, setCat] = useState<string>("");
  const [year, setYear] = useState<string>("");
  const lightbox = useLightbox();
  const photos = useMemo(() => {
    let list = data.archivePhotos ?? [];
    if (cat) list = list.filter((p) => p.categoryId === cat);
    if (year) list = list.filter((p) => p.year === year);
    const sorted = [...list];
    switch (block.sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "year-desc":
        sorted.sort((a, b) => b.year.localeCompare(a.year));
        break;
      case "year-asc":
        sorted.sort((a, b) => a.year.localeCompare(b.year));
        break;
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        sorted.sort((a, b) => a.archiveOrder - b.archiveOrder);
    }
    return sorted;
  }, [data.archivePhotos, cat, year, block.sort]);

  const span = Math.round(12 / block.columns);
  const cats = data.categories ?? [];
  const years = data.years ?? [];

  return (
    <div>
      {block.showFilters && (cats.length || years.length) ? (
        <div className="mb-10 flex flex-wrap gap-x-6 gap-y-2 eyebrow">
          <button onClick={() => { setCat(""); setYear(""); }} className={!cat && !year ? "text-ink" : "hover:text-ink"}>
            All
          </button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id === cat ? "" : c.id)} className={cat === c.id ? "text-ink" : "hover:text-ink"}>
              {c.name}
            </button>
          ))}
          {years.length ? <span className="text-ink-3">/</span> : null}
          {years.map((y) => (
            <button key={y} onClick={() => setYear(y === year ? "" : y)} className={year === y ? "text-ink" : "hover:text-ink"}>
              {y}
            </button>
          ))}
        </div>
      ) : null}
      {!photos.length ? (
        <div className="ed-empty-slot">{editor ? "No photos marked “Show in archive”" : ""}</div>
      ) : (
        <div className="ed-grid" style={{ rowGap: "var(--sp-m)" }}>
          {photos.map((p, i) => (
            <div key={p.id} className="ed-slot" style={{ "--span": String(span), "--span-md": String(Math.min(12, span * 2)), "--span-sm": "6" } as React.CSSProperties}>
              <EditorialImage photo={p} slot={newSlot({ span, fit: "cover", aspect: "4:5" })} onClick={!editor && data.interactive !== false ? () => lightbox.open(p) : undefined} />
              {block.showCaptions ? (
                <div className="ed-caption">
                  <span className="ed-cap-index">{String(i + 1).padStart(3, "0")}</span>
                  {p.title ? <span className="ed-cap-title">{p.title}</span> : null}
                  <span>{[p.location, p.year].filter(Boolean).join(", ")}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
