"use client";

import { useRef } from "react";
import type { PhotoView } from "@/lib/photos/view";

/**
 * Click on the image to place the focal point. Only the two numbers are
 * stored; the file is never touched. Used for object-position on crops.
 */
export function FocalPointEditor({ photo, x, y, onChange, aspectPreview }: { photo: PhotoView; x: number; y: number; onChange: (x: number, y: number) => void; aspectPreview?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function place(e: React.MouseEvent) {
    const r = ref.current!.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  }
  return (
    <div>
      <div ref={ref} onClick={place} className="relative cursor-crosshair select-none overflow-hidden rounded-sm bg-neutral-200" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}> <img src={photo.sources.webp[1]?.url ?? photo.thumbUrl} alt="" className="h-full w-full object-contain" draggable={false} />
        <div className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.6)]" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>
          <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="border border-white/60" />
          ))}
        </div>
      </div>
      {aspectPreview ? (
        <div className="mt-2">
          <div className="ui-label">Crop preview</div>
          <div className="overflow-hidden rounded-sm bg-neutral-200" style={{ aspectRatio: aspectPreview.replace(":", " / ") }}> <img src={photo.sources.webp[1]?.url ?? photo.thumbUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${x * 100}% ${y * 100}%` }} />
          </div>
        </div>
      ) : null}
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-neutral-500">
        <span>Click to set focal point</span>
        <button type="button" className="hover:text-neutral-900" onClick={() => onChange(0.5, 0.5)}>Reset</button>
      </div>
    </div>
  );
}
