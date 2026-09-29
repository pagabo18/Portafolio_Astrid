"use client";

import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import type { RenderData } from "@/components/editorial/types";
import { withSpan, type Block, type ImageSlot } from "@/lib/blocks/schema";
import { useEditor } from "./store";

const WIDTHS = { desktop: "100%", tablet: "834px", mobile: "390px" } as const;

export function Canvas({ data }: { data: Omit<RenderData, "photos"> }) {
  const doc = useEditor((s) => s.doc);
  const photos = useEditor((s) => s.photos);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const showGrid = useEditor((s) => s.showGrid);
  const device = useEditor((s) => s.device);
  const updateSlot = useEditor((s) => s.updateSlot);
  const updateBlock = useEditor((s) => s.updateBlock);

  const onDragSlot = (blockId: string, slotId: string, patch: { span?: number; start?: number | "auto"; offsetY?: number; anchorX?: "custom" }) =>
    updateSlot(
      blockId,
      slotId,
      (s: ImageSlot) => {
        let next: ImageSlot = { ...s, ...patch };
        if (patch.span !== undefined) next = withSpan({ ...next, span: s.span }, patch.span);
        if (patch.start !== undefined) next = { ...next, start: patch.start };
        return next;
      },
      `drag-${slotId}`,
    );

  const onDragBlock = (blockId: string, patch: { span?: number; start?: number | "auto" }) =>
    updateBlock(blockId, (b: Block) => (b.type === "text" ? { ...b, ...patch } : b), `drag-${blockId}`);

  return (
    <div className="h-full overflow-auto bg-neutral-200/70 p-6" onClick={() => select(null)}>
      <div
        className="mx-auto min-h-full bg-paper shadow-[0_2px_30px_rgba(0,0,0,0.12)] transition-[width] duration-300"
        style={{ width: WIDTHS[device], maxWidth: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <EditorialRoot document={doc} data={{ ...data, photos, interactive: false }} editor={{ selection, onSelect: select, showGrid, onDragSlot, onDragBlock }} preview />
      </div>
    </div>
  );
}
