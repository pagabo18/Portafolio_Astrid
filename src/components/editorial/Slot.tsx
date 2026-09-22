"use client";

import type { CSSProperties } from "react";
import type { ImageSlot, SlotOverride } from "@/lib/blocks/schema";
import { EditorialImage } from "./EditorialImage";
import { Caption } from "./Caption";
import { useLightbox } from "./Lightbox";
import type { EditorHooks, RenderData } from "./types";

/**
 * Automatic responsive behaviour when the admin has not overridden a
 * breakpoint. Tablet keeps most compositions; mobile stacks anything wider
 * than a third and lets small items sit two per row.
 */
export function autoTablet(slot: ImageSlot): Required<Pick<SlotOverride, "span" | "start" | "offsetX" | "offsetY">> {
  const span = slot.span <= 3 ? 4 : slot.span;
  return {
    span,
    start: slot.start === "auto" ? "auto" : Math.min(slot.start, 13 - span),
    offsetX: Math.trunc(slot.offsetX / 2),
    offsetY: Math.trunc(slot.offsetY / 2),
  };
}
export function autoMobile(slot: ImageSlot): Required<Pick<SlotOverride, "span" | "start" | "offsetX" | "offsetY">> {
  return { span: slot.span <= 4 ? 6 : 12, start: "auto", offsetX: 0, offsetY: 0 };
}

export function slotStyle(slot: ImageSlot): CSSProperties {
  const t = { ...autoTablet(slot), ...(slot.responsive.tablet ?? {}) };
  const m = { ...autoMobile(slot), ...(slot.responsive.mobile ?? {}) };
  const v = slot.vAlign === "top" ? "start" : slot.vAlign === "bottom" ? "end" : "center";
  const s: Record<string, string> = {
    "--span": String(slot.span),
    "--start": slot.start === "auto" ? "auto" : String(slot.start),
    "--ox": String(slot.offsetX),
    "--oy": String(slot.offsetY),
    "--span-md": String(t.span),
    "--start-md": t.start === "auto" ? "auto" : String(t.start),
    "--ox-md": String(t.offsetX),
    "--oy-md": String(t.offsetY),
    "--span-sm": String(m.span),
    "--start-sm": m.start === "auto" ? "auto" : String(m.start),
    "--ox-sm": String(m.offsetX),
    "--oy-sm": String(m.offsetY),
    "--valign": v,
  };
  if (slot.overlap) s["--z"] = String(slot.zIndex);
  return s as CSSProperties;
}

export function Slot({
  slot,
  blockId,
  data,
  editor,
  index,
  priority,
  bleed,
}: {
  slot: ImageSlot;
  blockId: string;
  data: RenderData;
  editor?: EditorHooks;
  index?: number;
  priority?: boolean;
  bleed?: boolean;
}) {
  const photo = slot.photoId ? data.photos[slot.photoId] : undefined;
  const lightbox = useLightbox();
  const selected = editor?.selection?.blockId === blockId && editor?.selection?.slotId === slot.id;
  if (!slot.visible && !editor) return null;
  if (!photo && !editor) return null;

  const hiddenMd = slot.responsive.tablet?.hidden;
  const hiddenSm = slot.responsive.mobile?.hidden;

  return (
    <div
      className={`ed-slot ${bleed ? "ed-bleed" : ""}`}
      style={slotStyle(slot)}
      data-slot-id={slot.id}
      data-selected={selected ? "true" : undefined}
      data-overlap={slot.overlap ? "true" : undefined}
      data-hidden-md={hiddenMd ? "true" : undefined}
      data-hidden-sm={hiddenSm ? "true" : undefined}
      onClick={
        editor
          ? (e) => {
              e.stopPropagation();
              editor.onSelect({ blockId, slotId: slot.id });
            }
          : undefined
      }
    >
      {photo ? (
        <>
          <EditorialImage
            photo={photo}
            slot={slot}
            priority={priority}
            onClick={!editor && data.interactive !== false && slot.fullscreen ? () => lightbox.open(photo) : undefined}
          />
          <Caption slot={slot} photo={photo} index={index} />
        </>
      ) : (
        <div className="ed-empty-slot">{editor ? "Select photo" : ""}</div>
      )}
      {editor && !slot.visible ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/60 text-[10px] uppercase tracking-widest text-neutral-500">
          Hidden
        </div>
      ) : null}
    </div>
  );
}
