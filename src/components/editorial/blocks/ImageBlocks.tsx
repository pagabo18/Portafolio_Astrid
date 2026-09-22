"use client";

import type { ImageBlock, ImageGroupBlock } from "@/lib/blocks/schema";
import { Slot } from "../Slot";
import type { EditorHooks, RenderData } from "../types";

export function ImageBlockView({
  block,
  data,
  editor,
  startIndex,
  priority,
}: {
  block: ImageBlock;
  data: RenderData;
  editor?: EditorHooks;
  startIndex: number;
  priority?: boolean;
}) {
  const bleed = block.layout === "full-bleed";
  if (bleed) {
    return (
      <div className="ed-grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <Slot slot={{ ...block.image, span: 12, start: 1, offsetX: 0 }} blockId={block.id} data={data} editor={editor} index={startIndex} priority={priority} bleed />
      </div>
    );
  }
  return (
    <div className="ed-grid">
      <Slot slot={block.image} blockId={block.id} data={data} editor={editor} index={startIndex} priority={priority} />
    </div>
  );
}

export function ImageGroupBlockView({
  block,
  data,
  editor,
  startIndex,
}: {
  block: ImageGroupBlock;
  data: RenderData;
  editor?: EditorHooks;
  startIndex: number;
}) {
  const style = { "--row-gap": `var(--sp-${block.gap})`, columnGap: block.gap === "none" ? 0 : `var(--sp-${block.gap})` } as React.CSSProperties;
  return (
    <div className="ed-grid" data-gap={block.gap} style={style}>
      {block.images.map((s, i) => (
        <Slot key={s.id} slot={s} blockId={block.id} data={data} editor={editor} index={startIndex + i} />
      ))}
    </div>
  );
}
