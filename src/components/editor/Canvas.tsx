"use client";

import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import type { RenderData } from "@/components/editorial/types";
import { useEditor } from "./store";

const WIDTHS = { desktop: "100%", tablet: "834px", mobile: "390px" } as const;

export function Canvas({ data }: { data: Omit<RenderData, "photos"> }) {
  const doc = useEditor((s) => s.doc);
  const photos = useEditor((s) => s.photos);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const showGrid = useEditor((s) => s.showGrid);
  const device = useEditor((s) => s.device);

  return (
    <div className="h-full overflow-auto bg-neutral-200/70 p-6" onClick={() => select(null)}>
      <div
        className="mx-auto min-h-full bg-paper shadow-[0_2px_30px_rgba(0,0,0,0.12)] transition-[width] duration-300"
        style={{ width: WIDTHS[device], maxWidth: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <EditorialRoot document={doc} data={{ ...data, photos, interactive: false }} editor={{ selection, onSelect: select, showGrid }} preview />
      </div>
    </div>
  );
}
