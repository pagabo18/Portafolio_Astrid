"use client";

import { useState } from "react";
import type { Block, ImageGroupBlock, ImageSlot, Spacing, SlotOverride, Aspect } from "@/lib/blocks/schema";
import { SPACING, ASPECTS } from "@/lib/blocks/schema";
import { applyGroupLayout, applySingleLayout, GROUP_LAYOUT_INFO, SINGLE_LAYOUT_INFO, spacingLabel, type LayoutInfo } from "@/lib/blocks/templates";
import type { PhotoView } from "@/lib/photos/view";
import { api } from "@/lib/client/api";
import { Field, Segmented, Stepper, Toggle } from "@/components/admin/ui/Fields";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { Modal } from "@/components/admin/ui/Modal";
import { findSelected, useEditor } from "./store";
import { autoMobile, autoTablet } from "@/components/editorial/Slot";

export function Inspector({ onPickPhotos, scope }: { onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void; scope: "project" | "page" }) {
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const { block, slot } = findSelected(doc, selection);

  if (!block) {
    return (
      <div className="p-4 text-[12px] leading-relaxed text-neutral-500">
        <div className="eyebrow mb-2">Inspector</div>
        Select a block in the list or click a photograph in the canvas to edit its size, position, spacing and captions.
        <ul className="mt-4 space-y-1 text-[11px] text-neutral-400">
          <li>⌘/Ctrl + Z — undo</li>
          <li>⌘/Ctrl + ⇧ + Z — redo</li>
          <li>⌘/Ctrl + S — save draft</li>
          <li>Delete — remove selected block</li>
          <li>Esc — deselect</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {slot ? <SlotInspector block={block} slot={slot} onPickPhotos={onPickPhotos} /> : null}
        <BlockInspector block={block} onPickPhotos={onPickPhotos} collapsed={!!slot} scope={scope} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slot (a photo instance)                                              */
/* ------------------------------------------------------------------ */

const SPAN_PRESETS = [
  { value: 3, label: "25%" },
  { value: 4, label: "33%" },
  { value: 6, label: "50%" },
  { value: 8, label: "66%" },
  { value: 9, label: "75%" },
  { value: 12, label: "100%" },
];

function SlotInspector({ block, slot, onPickPhotos }: { block: Block; slot: ImageSlot; onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void }) {
  const photos = useEditor((s) => s.photos);
  const updateSlot = useEditor((s) => s.updateSlot);
  const removeSlot = useEditor((s) => s.removeSlot);
  const mergePhotos = useEditor((s) => s.mergePhotos);
  const [focal, setFocal] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [bp, setBp] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const photo = slot.photoId ? photos[slot.photoId] : undefined;
  const set = (patch: Partial<ImageSlot>, key?: string) => updateSlot(block.id, slot.id, patch, key);
  const isGroup = block.type === "image-group";

  const alignH = slot.start === "auto" ? "auto" : slot.start === 1 ? "left" : slot.start + slot.span - 1 === 12 ? "right" : Math.abs(slot.start - 1 - (12 - (slot.start + slot.span - 1))) <= 1 ? "center" : "custom";
  function align(where: "left" | "center" | "right" | "auto") {
    if (where === "auto") return set({ start: "auto", offsetX: 0 });
    const start = where === "left" ? 1 : where === "right" ? 13 - slot.span : Math.max(1, Math.round((12 - slot.span) / 2) + 1);
    set({ start, offsetX: 0 });
  }
  function setSpan(span: number) {
    const start = slot.start === "auto" ? "auto" : Math.min(slot.start, 13 - span);
    set({ span, start });
  }

  const ov: SlotOverride = bp === "tablet" ? slot.responsive.tablet ?? {} : bp === "mobile" ? slot.responsive.mobile ?? {} : {};
  const auto = bp === "tablet" ? autoTablet(slot) : autoMobile(slot);
  const setOv = (patch: SlotOverride | null) => {
    const responsive = { ...slot.responsive };
    if (bp === "desktop") return;
    if (patch === null) delete responsive[bp];
    else responsive[bp] = { ...(responsive[bp] ?? {}), ...patch };
    set({ responsive });
  };
  const hasOv = bp !== "desktop" && Object.keys(ov).length > 0;

  return (
    <div className="border-b border-neutral-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">Image settings</span>
        {isGroup ? <button className="text-[11px] text-red-600 hover:underline" onClick={() => removeSlot(block.id, slot.id)}>Remove from group</button> : null}
      </div>

      <div className="mb-4 flex gap-3">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
          {photo ? <img src={photo.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1 text-[11px] text-neutral-500">
          <div className="truncate text-neutral-900">{photo?.title || photo?.filename || "No photo"}</div>
          {photo ? <div>{photo.width}×{photo.height} · {photo.orientation}</div> : null}
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="ui-btn h-6 px-2 text-[11px]" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { if (p[0]) { mergePhotos(p); set({ photoId: p[0].id }); } } })}>
              {photo ? "Replace" : "Select photo"}
            </button>
            {photo ? <button className="ui-btn h-6 px-2 text-[11px]" onClick={() => setFocal(true)}>Focal point</button> : null}
          </div>
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between">
        <span className="ui-label mb-0">Breakpoint</span>
        <Segmented value={bp} onChange={setBp} size="sm" options={[{ value: "desktop", label: "Desktop" }, { value: "tablet", label: "Tablet" }, { value: "mobile", label: "Mobile" }]} />
      </div>

      {bp === "desktop" ? (
        <>
          <Field label="Size">
            <Segmented value={slot.span} onChange={setSpan} options={SPAN_PRESETS.map((p) => ({ value: p.value, label: p.label, title: `${p.value} columns` }))} />
            <div className="mt-1.5 flex items-center gap-2">
              <Stepper value={slot.span} min={1} max={12} onChange={setSpan} format={(v) => `${v} col`} />
              <span className="text-[10.5px] text-neutral-400">{slot.span <= 4 ? "Small" : slot.span <= 7 ? "Medium" : slot.span <= 10 ? "Large" : "Full width"}</span>
            </div>
          </Field>

          <Field label="Alignment">
            <Segmented value={alignH} onChange={(v) => v !== "custom" && align(v as "left" | "center" | "right" | "auto")} options={[{ value: "auto", label: "Auto" }, { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }, ...(alignH === "custom" ? [{ value: "custom", label: "Custom" }] : [])]} />
          </Field>

          <Field label="Position on grid" hint="Click a column to set where the photo starts.">
            <GridBar span={slot.span} start={slot.start} onStart={(s) => set({ start: s })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Offset X"><Stepper value={slot.offsetX} min={-4} max={4} onChange={(v) => set({ offsetX: v })} format={(v) => (v > 0 ? `+${v}` : String(v))} /></Field>
            <Field label="Offset Y"><Stepper value={slot.offsetY} min={-4} max={4} onChange={(v) => set({ offsetY: v })} format={(v) => (v > 0 ? `+${v}` : String(v))} /></Field>
          </div>

          {isGroup || block.type === "text-image" ? (
            <Field label="Vertical alignment">
              <Segmented value={slot.vAlign} onChange={(v) => set({ vAlign: v })} options={[{ value: "top", label: "Top" }, { value: "center", label: "Center" }, { value: "bottom", label: "Bottom" }]} />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Crop">
              <select className="ui-input" value={slot.aspect} onChange={(e) => set({ aspect: e.target.value as Aspect, fit: e.target.value === "auto" ? "contain" : "cover" })}>
                {ASPECTS.map((a) => <option key={a} value={a}>{a === "auto" ? "None (original)" : a}</option>)}
              </select>
            </Field>
            <Field label="Object fit">
              <Segmented value={slot.fit} onChange={(v) => set({ fit: v })} options={[{ value: "contain", label: "Contain" }, { value: "cover", label: "Cover" }]} />
            </Field>
          </div>
        </>
      ) : (
        <div className="mb-3 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-neutral-700">{hasOv ? "Manual override" : "Auto"}</span>
            {hasOv ? <button className="text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => setOv(null)}>Reset to auto</button> : <span className="text-[10.5px] text-neutral-400">auto: {auto.span} col</span>}
          </div>
          <Field label="Size">
            <Segmented value={ov.span ?? auto.span} onChange={(v) => setOv({ span: v })} options={SPAN_PRESETS.map((p) => ({ value: p.value, label: p.label }))} />
          </Field>
          <Field label="Alignment">
            <Segmented
              value={(ov.start ?? auto.start) === "auto" ? "auto" : (ov.start ?? 1) === 1 ? "left" : (ov.start as number) + (ov.span ?? auto.span) - 1 >= 12 ? "right" : "center"}
              onChange={(v) => {
                const span = ov.span ?? auto.span;
                setOv({ start: v === "auto" ? "auto" : v === "left" ? 1 : v === "right" ? 13 - span : Math.max(1, Math.round((12 - span) / 2) + 1) });
              }}
              options={[{ value: "auto", label: "Auto" }, { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Offset X"><Stepper value={ov.offsetX ?? auto.offsetX} min={-4} max={4} onChange={(v) => setOv({ offsetX: v })} /></Field>
            <Field label="Offset Y"><Stepper value={ov.offsetY ?? auto.offsetY} min={-4} max={4} onChange={(v) => setOv({ offsetY: v })} /></Field>
          </div>
          <Toggle label={`Hide on ${bp}`} checked={!!ov.hidden} onChange={(v) => setOv({ hidden: v || undefined })} />
        </div>
      )}

      <div className="mt-2 border-t border-neutral-100 pt-3">
        <div className="eyebrow mb-1">Caption</div>
        <Toggle label="Show caption" checked={slot.caption.show} onChange={(v) => set({ caption: { ...slot.caption, show: v } })} />
        {slot.caption.show ? (
          <div className="mt-1 space-y-0.5 pl-2">
            {(["index", "title", "location", "year", "caption", "metadata"] as const).map((k) => (
              <Toggle key={k} label={k === "caption" ? "Description" : k === "metadata" ? "Camera / lens" : k[0].toUpperCase() + k.slice(1)} checked={slot.caption[k]} onChange={(v) => set({ caption: { ...slot.caption, [k]: v } })} />
            ))}
            <Field label="Caption text (this placement only)">
              <input className="ui-input" value={slot.caption.text} onChange={(e) => set({ caption: { ...slot.caption, text: e.target.value } }, `cap-${slot.id}`)} placeholder={photo?.description || "—"} />
            </Field>
            <Field label="Align">
              <Segmented value={slot.caption.align} onChange={(v) => set({ caption: { ...slot.caption, align: v } })} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
            </Field>
          </div>
        ) : null}
      </div>

      <div className="mt-2 border-t border-neutral-100 pt-2">
        <Toggle label="Full screen on click" checked={slot.fullscreen} onChange={(v) => set({ fullscreen: v })} />
        <Toggle label="Visible" checked={slot.visible} onChange={(v) => set({ visible: v })} />
      </div>

      <button className="mt-3 text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => setAdvanced((a) => !a)}>
        {advanced ? "▾" : "▸"} Advanced (rotation, scale, overlap)
      </button>
      {advanced ? (
        <div className="mt-2 space-y-2 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
          <Field label={`Rotation · ${slot.rotation}°`}>
            <input type="range" min={-15} max={15} step={0.5} value={slot.rotation} onChange={(e) => set({ rotation: Number(e.target.value) }, `rot-${slot.id}`)} className="w-full" />
          </Field>
          <Field label={`Scale · ${slot.scale.toFixed(2)}`}>
            <input type="range" min={0.5} max={1.5} step={0.01} value={slot.scale} onChange={(e) => set({ scale: Number(e.target.value) }, `scale-${slot.id}`)} className="w-full" />
          </Field>
          <Toggle label="Allow overlap" checked={slot.overlap} onChange={(v) => set({ overlap: v })} />
          {slot.overlap ? <Field label="Layer (z-index)"><Stepper value={slot.zIndex} min={0} max={10} onChange={(v) => set({ zIndex: v })} /></Field> : null}
          <button className="text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => set({ rotation: 0, scale: 1, overlap: false, zIndex: 0 })}>Reset transforms</button>
          <p className="text-[10.5px] text-neutral-400">Presentation only — the file is never modified.</p>
        </div>
      ) : null}

      {photo ? (
        <FocalModal open={focal} onClose={() => setFocal(false)} photo={photo} slot={slot} onSlot={(f) => set({ focal: f })} onPhoto={(x, y) => { mergePhotos([{ ...photo, focalX: x, focalY: y }]); api(`/api/admin/photos/${photo.id}`, { method: "PATCH", json: { focalX: x, focalY: y } }); }} />
      ) : null}
    </div>
  );
}

function FocalModal({ open, onClose, photo, slot, onSlot, onPhoto }: { open: boolean; onClose: () => void; photo: PhotoView; slot: ImageSlot; onSlot: (f: { x: number; y: number } | null) => void; onPhoto: (x: number, y: number) => void }) {
  const [mode, setMode] = useState<"photo" | "slot">(slot.focal ? "slot" : "photo");
  const x = mode === "slot" ? slot.focal?.x ?? photo.focalX : photo.focalX;
  const y = mode === "slot" ? slot.focal?.y ?? photo.focalY : photo.focalY;
  return (
    <Modal open={open} onClose={onClose} title="Focal point" width="max-w-lg" footer={<button className="ui-btn ui-btn-primary" onClick={onClose}>Done</button>}>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Segmented value={mode} onChange={(m) => { setMode(m); if (m === "photo") onSlot(null); }} options={[{ value: "photo", label: "For this photo everywhere" }, { value: "slot", label: "Only this placement" }]} />
        </div>
        <FocalPointEditor photo={photo} x={x} y={y} aspectPreview={slot.aspect !== "auto" ? slot.aspect : "16:9"} onChange={(nx, ny) => (mode === "slot" ? onSlot({ x: nx, y: ny }) : onPhoto(nx, ny))} />
        <p className="mt-3 text-[11px] text-neutral-500">The focal point decides which part of the image stays visible when a layout crops it. Only two numbers are stored; the original file is untouched.</p>
      </div>
    </Modal>
  );
}

/** Visual 12-column bar. */
function GridBar({ span, start, onStart }: { span: number; start: number | "auto"; onStart: (s: number | "auto") => void }) {
  const s = start === "auto" ? null : start;
  return (
    <div>
      <div className="grid grid-cols-12 gap-px overflow-hidden rounded-sm border border-neutral-200 bg-neutral-200">
        {Array.from({ length: 12 }, (_, i) => {
          const col = i + 1;
          const active = s !== null && col >= s && col < s + span;
          const possible = col + span - 1 <= 12;
          return (
            <button
              key={col}
              type="button"
              disabled={!possible}
              title={possible ? `Start at column ${col}` : ""}
              onClick={() => onStart(col)}
              className={`h-6 text-[9px] tabular-nums transition ${active ? "bg-neutral-900 text-white" : possible ? "bg-white text-neutral-400 hover:bg-neutral-100" : "bg-neutral-50 text-neutral-200"}`}
            >
              {col}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-neutral-400">
        <span>{s === null ? "Auto placement (flows after the previous photo)" : `Columns ${s}–${s + span - 1}`}</span>
        {s !== null ? <button type="button" className="hover:text-neutral-900" onClick={() => onStart("auto")}>Set auto</button> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block                                                                */
/* ------------------------------------------------------------------ */

function SpacingSelect({ value, onChange }: { value: Spacing; onChange: (v: Spacing) => void }) {
  return <Segmented value={value} onChange={onChange} size="sm" options={SPACING.map((s) => ({ value: s, label: spacingLabel[s] }))} />;
}

function BlockInspector({ block, onPickPhotos, collapsed, scope }: { block: Block; onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void; collapsed: boolean; scope: "project" | "page" }) {
  const updateBlock = useEditor((s) => s.updateBlock);
  const removeBlock = useEditor((s) => s.removeBlock);
  const duplicate = useEditor((s) => s.duplicate);
  const select = useEditor((s) => s.select);
  const [open, setOpen] = useState(!collapsed);
  const set = (patch: Partial<Block>, key?: string) => updateBlock(block.id, patch as never, key);
  void scope;

  return (
    <div className="p-4">
      <button className="mb-3 flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <span className="eyebrow">Block · {block.type.replace("-", " ")}</span>
        <span className="text-[11px] text-neutral-400">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <>
          <TypeFields block={block} onPickPhotos={onPickPhotos} />

          <div className="mt-3 border-t border-neutral-100 pt-3">
            <Field label="Top spacing"><SpacingSelect value={block.spacingTop} onChange={(v) => set({ spacingTop: v })} /></Field>
            <Field label="Bottom spacing"><SpacingSelect value={block.spacingBottom} onChange={(v) => set({ spacingBottom: v })} /></Field>
            <Field label="Background">
              <Segmented value={block.background} onChange={(v) => set({ background: v })} options={[{ value: "default", label: "Default" }, { value: "offwhite", label: "Off white" }, { value: "black", label: "Black" }]} />
            </Field>
            <Field label="Label (admin only)"><input className="ui-input" value={block.label} onChange={(e) => set({ label: e.target.value }, `label-${block.id}`)} placeholder="e.g. Opening spread" /></Field>
            <Toggle label="Visible" checked={block.visible} onChange={(v) => set({ visible: v })} />
          </div>

          <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
            <button className="ui-btn" onClick={() => duplicate(block.id)}>Duplicate</button>
            <button className="ui-btn ui-btn-danger ml-auto" onClick={() => { removeBlock(block.id); select(null); }}>Remove block</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TypeFields({ block, onPickPhotos }: { block: Block; onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void }) {
  const updateBlock = useEditor((s) => s.updateBlock);
  const mergePhotos = useEditor((s) => s.mergePhotos);
  const addSlots = useEditor((s) => s.addSlots);
  const photos = useEditor((s) => s.photos);
  const select = useEditor((s) => s.select);
  const moveSlot = useEditor((s) => s.moveSlot);
  const removeSlot = useEditor((s) => s.removeSlot);
  const [layouts, setLayouts] = useState(false);
  const set = (patch: Partial<Block>, key?: string) => updateBlock(block.id, patch as never, key);

  switch (block.type) {
    case "image":
      return (
        <>
          <Field label="Layout">
            <button className="ui-btn w-full justify-between" onClick={() => setLayouts(true)}>
              <span>{SINGLE_LAYOUT_INFO[block.layout].number} — {SINGLE_LAYOUT_INFO[block.layout].name}</span><span>▾</span>
            </button>
          </Field>
          <LayoutPicker open={layouts} onClose={() => setLayouts(false)} kind="single" current={block.layout} onPick={(l) => updateBlock(block.id, (b: Block) => (b.type === "image" ? applySingleLayout(b, l.id as never) : b))} />
          {!block.image.photoId ? <button className="ui-btn w-full" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); updateBlock(block.id, (b: Block) => (b.type === "image" ? { ...b, image: { ...b.image, photoId: p[0].id } } : b)); } })}>Select photo</button> : null}
          <p className="text-[10.5px] text-neutral-400">Click the photograph in the canvas to edit its size, position and caption.</p>
        </>
      );
    case "image-group":
      return (
        <>
          <Field label="Layout">
            <button className="ui-btn w-full justify-between" onClick={() => setLayouts(true)}>
              <span>{GROUP_LAYOUT_INFO[block.layout].number} — {GROUP_LAYOUT_INFO[block.layout].name}</span><span>▾</span>
            </button>
          </Field>
          <LayoutPicker open={layouts} onClose={() => setLayouts(false)} kind="group" current={block.layout} onPick={(l) => updateBlock(block.id, (b: Block) => (b.type === "image-group" ? applyGroupLayout(b, l.id as never) : b))} />
          <Field label="Gap"><SpacingSelect value={block.gap} onChange={(v) => set({ gap: v } as Partial<ImageGroupBlock>)} /></Field>
          <Field label={`Photos · ${block.images.length}`}>
            <ul className="space-y-1">
              {block.images.map((s, i) => {
                const p = s.photoId ? photos[s.photoId] : undefined;
                return (
                  <li key={s.id} className="flex items-center gap-2 rounded-sm border border-neutral-200 bg-white p-1 text-[11px]">
                    <button className="h-8 w-10 shrink-0 overflow-hidden rounded-sm bg-neutral-100" onClick={() => select({ blockId: block.id, slotId: s.id })}>
                      {p ? <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </button>
                    <button className="min-w-0 flex-1 truncate text-left" onClick={() => select({ blockId: block.id, slotId: s.id })}>{p?.title || p?.filename || "Empty"} · {s.span} col</button>
                    <button className="px-1 text-neutral-400 hover:text-neutral-900" disabled={i === 0} onClick={() => moveSlot(block.id, i, i - 1)}>↑</button>
                    <button className="px-1 text-neutral-400 hover:text-neutral-900" disabled={i === block.images.length - 1} onClick={() => moveSlot(block.id, i, i + 1)}>↓</button>
                    <button className="px-1 text-neutral-400 hover:text-red-600" onClick={() => removeSlot(block.id, s.id)}>✕</button>
                  </li>
                );
              })}
            </ul>
            <button className="ui-btn mt-2 w-full" onClick={() => onPickPhotos({ multiple: true, onPick: (p) => { mergePhotos(p); addSlots(block.id, p.map((x) => x.id)); } })}>+ Add photos</button>
          </Field>
        </>
      );
    case "text":
      return (
        <>
          <Field label="Text"><textarea className="ui-input min-h-32" value={block.content} onChange={(e) => set({ content: e.target.value } as never, `text-${block.id}`)} /></Field>
          <Field label="Style"><Segmented value={block.variant} onChange={(v) => set({ variant: v } as never)} options={[{ value: "body", label: "Body" }, { value: "lead", label: "Lead" }, { value: "quote", label: "Quote" }, { value: "small", label: "Small" }]} /></Field>
          <Field label="Align"><Segmented value={block.align} onChange={(v) => set({ align: v } as never)} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} /></Field>
          <Field label="Width"><Stepper value={block.span} min={3} max={12} onChange={(v) => set({ span: v, start: block.start === "auto" ? "auto" : Math.min(block.start, 13 - v) } as never)} format={(v) => `${v} col`} /></Field>
          <Field label="Position"><GridBar span={block.span} start={block.start} onStart={(s) => set({ start: s } as never)} /></Field>
        </>
      );
    case "text-image":
      return (
        <>
          <Field label="Text"><textarea className="ui-input min-h-28" value={block.content} onChange={(e) => set({ content: e.target.value } as never, `text-${block.id}`)} /></Field>
          <Field label="Order"><Segmented value={block.order} onChange={(v) => set({ order: v } as never)} options={[{ value: "text-first", label: "Text + photo" }, { value: "image-first", label: "Photo + text" }]} /></Field>
          <Field label="Text width"><Stepper value={block.textSpan} min={2} max={8} onChange={(v) => set({ textSpan: v } as never)} format={(v) => `${v} col`} /></Field>
          <Field label="Vertical alignment"><Segmented value={block.vAlign} onChange={(v) => set({ vAlign: v } as never)} options={[{ value: "top", label: "Top" }, { value: "center", label: "Center" }, { value: "bottom", label: "Bottom" }]} /></Field>
          {!block.image.photoId ? <button className="ui-btn w-full" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); updateBlock(block.id, (b: Block) => (b.type === "text-image" ? { ...b, image: { ...b.image, photoId: p[0].id } } : b)); } })}>Select photo</button> : null}
        </>
      );
    case "spacer":
      return <Field label="Size"><SpacingSelect value={block.size} onChange={(v) => set({ size: v } as never)} /></Field>;
    case "chapter":
      return (
        <>
          <Field label="Number"><input className="ui-input" value={block.number} onChange={(e) => set({ number: e.target.value } as never, `n-${block.id}`)} placeholder="01" /></Field>
          <Field label="Title"><input className="ui-input" value={block.title} onChange={(e) => set({ title: e.target.value } as never, `t-${block.id}`)} /></Field>
          <Field label="Subtitle"><input className="ui-input" value={block.subtitle} onChange={(e) => set({ subtitle: e.target.value } as never, `s-${block.id}`)} /></Field>
          <Field label="Align"><Segmented value={block.align} onChange={(v) => set({ align: v } as never)} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} /></Field>
        </>
      );
    case "project-header":
      return (
        <>
          <Toggle label="Show index number" checked={block.showIndex} onChange={(v) => set({ showIndex: v } as never)} />
          <Toggle label="Show title" checked={block.showTitle} onChange={(v) => set({ showTitle: v } as never)} />
          <Toggle label="Show year / location / category" checked={block.showMeta} onChange={(v) => set({ showMeta: v } as never)} />
          <Toggle label="Show description" checked={block.showDescription} onChange={(v) => set({ showDescription: v } as never)} />
          <Field label="Align"><Segmented value={block.align} onChange={(v) => set({ align: v } as never)} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} /></Field>
          <p className="text-[10.5px] text-neutral-400">Title, year, location and description are edited in Project settings (top bar).</p>
        </>
      );
    case "project-list":
      return (
        <>
          <Field label="Source"><Segmented value={block.source} onChange={(v) => set({ source: v } as never)} options={[{ value: "home", label: "Show on home" }, { value: "featured", label: "Featured" }, { value: "all", label: "All" }]} /></Field>
          <Field label="Style"><Segmented value={block.style} onChange={(v) => set({ style: v } as never)} options={[{ value: "editorial", label: "Editorial" }, { value: "grid", label: "Grid" }, { value: "index", label: "Index" }]} /></Field>
          <Field label="Limit (0 = all)"><Stepper value={block.limit} min={0} max={50} onChange={(v) => set({ limit: v } as never)} /></Field>
          <Toggle label="Show year / location" checked={block.showMeta} onChange={(v) => set({ showMeta: v } as never)} />
          <p className="text-[10.5px] text-neutral-400">Order follows the Projects list (drag to reorder there). Only published projects appear.</p>
        </>
      );
    case "photo-archive":
      return (
        <>
          <Field label="Columns"><Segmented value={block.columns} onChange={(v) => set({ columns: v } as never)} options={[2, 3, 4, 6].map((n) => ({ value: n, label: String(n) }))} /></Field>
          <Field label="Sort">
            <select className="ui-input" value={block.sort} onChange={(e) => set({ sort: e.target.value } as never)}>
              <option value="manual">Manual (archive order)</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="year-desc">Year ↓</option>
              <option value="year-asc">Year ↑</option>
              <option value="title">Title</option>
            </select>
          </Field>
          <Toggle label="Show category / year filters" checked={block.showFilters} onChange={(v) => set({ showFilters: v } as never)} />
          <Toggle label="Show captions" checked={block.showCaptions} onChange={(v) => set({ showCaptions: v } as never)} />
          <p className="text-[10.5px] text-neutral-400">Which photos appear is controlled per photo (“Show in archive”) in the library. Manual order: Archive settings.</p>
        </>
      );
  }
}

export function LayoutPicker({ open, onClose, kind, current, onPick }: { open: boolean; onClose: () => void; kind: "single" | "group" | "all"; current?: string; onPick: (l: LayoutInfo) => void }) {
  const list = [...(kind !== "group" ? Object.values(SINGLE_LAYOUT_INFO) : []), ...(kind !== "single" ? Object.values(GROUP_LAYOUT_INFO) : [])];
  return (
    <Modal open={open} onClose={onClose} title="Editorial layouts" width="max-w-3xl">
      <div className="grid grid-cols-3 gap-2 p-4">
        {list.map((l) => (
          <button key={l.id} onClick={() => { onPick(l); onClose(); }} className={`rounded-sm border p-3 text-left transition hover:border-neutral-900 ${current === l.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}>
            <pre className="mb-2 whitespace-pre font-mono text-[10px] leading-[14px] text-neutral-700">{l.sketch.join("\n")}</pre>
            <div className="text-[11px]"><span className="text-neutral-400">{l.number}</span> — {l.name}</div>
            <div className="text-[10.5px] text-neutral-500">{l.description}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
