"use client";

import type { CSSProperties } from "react";
import type { ChapterBlock, ProjectHeaderBlock, SpacerBlock, TextBlock, TextImageBlock } from "@/lib/blocks/schema";
import { Slot } from "../Slot";
import type { EditorHooks, RenderData } from "../types";

function colStyle(span: number, start: number | "auto"): CSSProperties {
  return { "--span": String(span), "--start": start === "auto" ? "auto" : String(start), "--span-md": String(Math.min(12, span + 2)), "--span-sm": "12" } as CSSProperties;
}

export function TextBlockView({ block, editor }: { block: TextBlock; editor?: EditorHooks }) {
  return (
    <div className="ed-grid">
      <div className="ed-slot" style={colStyle(block.span, block.start)}>
        <div className="ed-text" data-variant={block.variant} data-align={block.align}>
          {block.content || (editor ? <span className="text-neutral-400">Empty text — select to edit</span> : null)}
        </div>
      </div>
    </div>
  );
}

export function TextImageBlockView({ block, data, editor, startIndex }: { block: TextImageBlock; data: RenderData; editor?: EditorHooks; startIndex: number }) {
  const imgSpan = block.image.span;
  const textStart = block.order === "text-first" ? 1 : Math.max(1, 13 - block.textSpan);
  const imgStart = block.order === "text-first" ? Math.max(block.textSpan + 1, 13 - imgSpan) : 1;
  const v = block.vAlign === "top" ? "start" : block.vAlign === "bottom" ? "end" : "center";
  return (
    <div className="ed-grid">
      <div className="ed-slot" style={{ ...colStyle(block.textSpan, textStart), "--valign": v, order: block.order === "text-first" ? 0 : 1 } as CSSProperties}>
        <div className="ed-text">{block.content || (editor ? <span className="text-neutral-400">Empty text — select to edit</span> : null)}</div>
      </div>
      <Slot slot={{ ...block.image, start: block.image.start === "auto" ? imgStart : block.image.start, vAlign: block.vAlign }} blockId={block.id} data={data} editor={editor} index={startIndex} />
    </div>
  );
}

export function SpacerBlockView({ block, editor }: { block: SpacerBlock; editor?: EditorHooks }) {
  return (
    <div style={{ height: `calc(var(--sp-${block.size}) * var(--sp-scale))` }} className="relative">
      {editor ? <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-300" /> : null}
    </div>
  );
}

export function ChapterBlockView({ block }: { block: ChapterBlock }) {
  const start = block.align === "center" ? 3 : block.align === "right" ? 5 : 1;
  return (
    <div className="ed-grid">
      <div className="ed-slot" style={colStyle(8, start)}>
        <div className={block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : ""}>
          {block.number ? <div className="ed-chapter-number mb-4">{block.number}</div> : null}
          {block.title ? <h2 className="ed-title">{block.title}</h2> : null}
          {block.subtitle ? <p className="eyebrow mt-4">{block.subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ProjectHeaderBlockView({ block, data }: { block: ProjectHeaderBlock; data: RenderData }) {
  const p = data.project;
  if (!p) return null;
  const meta = [p.year, p.location, p.categoryName].filter(Boolean);
  const start = block.align === "center" ? 3 : block.align === "right" ? 5 : 1;
  return (
    <div className="ed-grid">
      <div className="ed-slot" style={colStyle(8, start)}>
        <header className={block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : ""}>
          {block.showIndex && p.index !== undefined ? <div className="ed-chapter-number mb-5">{String(p.index).padStart(2, "0")}</div> : null}
          {block.showTitle ? <h1 className="ed-title">{p.name}</h1> : null}
          {block.showMeta && meta.length ? <p className="eyebrow mt-5">{meta.join(" — ")}</p> : null}
          {block.showDescription && p.description ? <p className="ed-text mt-8 max-w-[52ch]" style={block.align === "center" ? { marginInline: "auto" } : block.align === "right" ? { marginLeft: "auto" } : undefined}>{p.description}</p> : null}
        </header>
      </div>
    </div>
  );
}
