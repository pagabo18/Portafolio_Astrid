"use client";

import { useState } from "react";
import type { Block, ImageGroupBlock, ImageSlot, Spacing, SlotOverride, Aspect } from "@/lib/blocks/schema";
import { SPACING, ASPECTS, withAnchorX, withSpan, resolveStart } from "@/lib/blocks/schema";
import { applyGroupLayout, applySingleLayout, GROUP_LAYOUT_INFO, SINGLE_LAYOUT_INFO, spacingLabel, type LayoutInfo } from "@/lib/blocks/templates";
import type { PhotoView } from "@/lib/photos/view";
import { updatePhoto } from "@/lib/content/admin";
import { Field, Segmented, Stepper, Toggle } from "@/components/admin/ui/Fields";
import { AnchorPad, ColorPicker, FontPicker } from "@/components/admin/ui/Pickers";
import { useT } from "@/lib/i18n/useT";
import { FocalPointEditor } from "@/components/admin/FocalPointEditor";
import { Modal } from "@/components/admin/ui/Modal";
import { findSelected, useEditor } from "./store";
import { autoMobile, autoTablet } from "@/components/editorial/Slot";

export type ProjectMetaFields = { name: string; year: string; location: string; description: string };

export function Inspector({
  onPickPhotos,
  scope,
  projectMeta,
  onProjectMeta,
}: {
  onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void;
  scope: "project" | "page";
  projectMeta?: ProjectMetaFields;
  onProjectMeta?: (patch: Partial<ProjectMetaFields>) => void;
}) {
  const t = useT();
  const doc = useEditor((s) => s.doc);
  const selection = useEditor((s) => s.selection);
  const { block, slot } = findSelected(doc, selection);

  if (!block) {
    return (
      <div className="p-4 text-[12px] leading-relaxed text-neutral-500">
        <div className="eyebrow mb-2">{t("Inspector")}</div>
        {t("Select a block in the list or click a photograph in the canvas to edit its size, position, spacing and captions.")}
        <p className="mt-2 text-neutral-400">{t("Drag on the canvas to move · drag a handle to resize")}</p>
        <ul className="mt-4 space-y-1 text-[11px] text-neutral-400">
          <li>{t("⌘/Ctrl + Z — undo")}</li>
          <li>{t("⌘/Ctrl + ⇧ + Z — redo")}</li>
          <li>{t("⌘/Ctrl + S — save draft")}</li>
          <li>{t("Delete — remove selected block")}</li>
          <li>{t("Esc — deselect")}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {slot ? <SlotInspector block={block} slot={slot} onPickPhotos={onPickPhotos} /> : null}
        <BlockInspector key={`${block.id}-${slot ? "slot" : "block"}`} block={block} onPickPhotos={onPickPhotos} collapsed={!!slot} scope={scope} projectMeta={projectMeta} onProjectMeta={onProjectMeta} />
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
  const t = useT();
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

  function setAnchor(x: "left" | "center" | "right" | "custom", y: "top" | "center" | "bottom") {
    const next = withAnchorX(slot, x);
    set({ anchorX: next.anchorX, start: next.start, vAlign: y, offsetX: x === "custom" ? slot.offsetX : 0 });
  }
  function setSpan(span: number) {
    const next = withSpan(slot, span);
    set({ span: next.span, start: next.start });
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
        <span className="eyebrow">{t("Image settings")}</span>
        {isGroup ? <button className="text-[11px] text-red-600 hover:underline" onClick={() => removeSlot(block.id, slot.id)}>{t("Remove from group")}</button> : null}
      </div>

      <div className="mb-4 flex gap-3">
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
          {photo ? <img src={photo.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1 text-[11px] text-neutral-500">
          <div className="truncate text-neutral-900">{photo?.title || photo?.filename || t("No photo")}</div>
          {photo ? <div>{photo.width}×{photo.height} · {photo.orientation}</div> : null}
          <div className="mt-2 flex flex-wrap gap-1">
            <button className="ui-btn h-6 px-2 text-[11px]" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { if (p[0]) { mergePhotos(p); set({ photoId: p[0].id }); } } })}>
              {photo ? t("Replace") : t("Select photo")}
            </button>
            {photo ? <button className="ui-btn h-6 px-2 text-[11px]" onClick={() => setFocal(true)}>{t("Focal point")}</button> : null}
          </div>
        </div>
      </div>

      <div className="mb-1 flex items-center justify-between">
        <span className="ui-label mb-0">{t("Breakpoint")}</span>
        <Segmented value={bp} onChange={setBp} size="sm" options={[{ value: "desktop", label: t("Desktop") }, { value: "tablet", label: t("Tablet") }, { value: "mobile", label: t("Mobile") }]} />
      </div>

      {bp === "desktop" ? (
        <>
          <Field label={t("Size")}>
            <Segmented value={slot.span} onChange={setSpan} options={SPAN_PRESETS.map((p) => ({ value: p.value, label: p.label, title: `${p.value} col` }))} />
            <div className="mt-1.5">
              <Stepper value={slot.span} min={1} max={12} onChange={setSpan} format={(v) => `${v} col`} />
            </div>
          </Field>

          <Field label={t("Anchor")} hint={t("Pin the photo to an edge so it stays there when the width changes.")}>
            <AnchorPad x={slot.anchorX} y={slot.vAlign} onChange={setAnchor} />
          </Field>

          <Field label={t("Position on grid")} hint={t("Click a column to set where the photo starts.")}>
            <GridBar span={slot.span} start={resolveStart(slot)} onStart={(s) => set({ start: s, anchorX: "custom" })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Offset X")}><Stepper value={slot.offsetX} min={-4} max={4} onChange={(v) => set({ offsetX: v })} format={(v) => (v > 0 ? `+${v}` : String(v))} /></Field>
            <Field label={t("Offset Y")}><Stepper value={slot.offsetY} min={-4} max={4} onChange={(v) => set({ offsetY: v })} format={(v) => (v > 0 ? `+${v}` : String(v))} /></Field>
          </div>

          {isGroup || block.type === "text-image" ? (
            <Field label={t("Vertical alignment")}>
              <Segmented value={slot.vAlign} onChange={(v) => set({ vAlign: v })} options={[{ value: "top", label: t("Top") }, { value: "center", label: t("Center") }, { value: "bottom", label: t("Bottom") }]} />
            </Field>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Crop")}>
              <select className="ui-input" value={slot.aspect} onChange={(e) => set({ aspect: e.target.value as Aspect, fit: e.target.value === "auto" ? "contain" : "cover" })}>
                {ASPECTS.map((a) => <option key={a} value={a}>{a === "auto" ? t("None (original)") : a}</option>)}
              </select>
            </Field>
            <Field label={t("Object fit")}>
              <Segmented value={slot.fit} onChange={(v) => set({ fit: v })} options={[{ value: "contain", label: t("Contain") }, { value: "cover", label: t("Cover") }]} />
            </Field>
          </div>
        </>
      ) : (
        <div className="mb-3 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-neutral-700">{hasOv ? t("Manual override") : t("Auto")}</span>
            {hasOv ? <button className="text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => setOv(null)}>{t("Reset to auto")}</button> : <span className="text-[10.5px] text-neutral-400">auto: {auto.span} col</span>}
          </div>
          <Field label={t("Size")}>
            <Segmented value={ov.span ?? auto.span} onChange={(v) => setOv({ span: v })} options={SPAN_PRESETS.map((p) => ({ value: p.value, label: p.label }))} />
          </Field>
          <Field label={t("Alignment")}>
            <Segmented
              value={(ov.start ?? auto.start) === "auto" ? "auto" : (ov.start ?? 1) === 1 ? "left" : (ov.start as number) + (ov.span ?? auto.span) - 1 >= 12 ? "right" : "center"}
              onChange={(v) => {
                const span = ov.span ?? auto.span;
                setOv({ start: v === "auto" ? "auto" : v === "left" ? 1 : v === "right" ? 13 - span : Math.max(1, Math.round((12 - span) / 2) + 1) });
              }}
              options={[{ value: "auto", label: t("Auto") }, { value: "left", label: t("Left") }, { value: "center", label: t("Center") }, { value: "right", label: t("Right") }]}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Offset X")}><Stepper value={ov.offsetX ?? auto.offsetX} min={-4} max={4} onChange={(v) => setOv({ offsetX: v })} /></Field>
            <Field label={t("Offset Y")}><Stepper value={ov.offsetY ?? auto.offsetY} min={-4} max={4} onChange={(v) => setOv({ offsetY: v })} /></Field>
          </div>
          <Toggle label={`${t("Hide")} · ${t(bp[0].toUpperCase() + bp.slice(1))}`} checked={!!ov.hidden} onChange={(v) => setOv({ hidden: v || undefined })} />
        </div>
      )}

      <div className="mt-2 border-t border-neutral-100 pt-3">
        <div className="eyebrow mb-1">{t("Caption")}</div>
        <Toggle label={t("Show caption")} checked={slot.caption.show} onChange={(v) => set({ caption: { ...slot.caption, show: v } })} />
        {slot.caption.show ? (
          <div className="mt-1 space-y-0.5 pl-2">
            {(["index", "title", "location", "year", "caption", "metadata"] as const).map((k) => (
              <Toggle key={k} label={t(k === "caption" ? "Description" : k === "metadata" ? "Camera / lens" : k[0].toUpperCase() + k.slice(1))} checked={slot.caption[k]} onChange={(v) => set({ caption: { ...slot.caption, [k]: v } })} />
            ))}
            <Field label={t("Caption text (this placement only)")}>
              <input className="ui-input" value={slot.caption.text} onChange={(e) => set({ caption: { ...slot.caption, text: e.target.value } }, `cap-${slot.id}`)} placeholder={photo?.description || "—"} />
            </Field>
            <Field label={t("Align")}>
              <Segmented value={slot.caption.align} onChange={(v) => set({ caption: { ...slot.caption, align: v } })} options={[{ value: "left", label: t("Left") }, { value: "center", label: t("Center") }, { value: "right", label: t("Right") }]} />
            </Field>
          </div>
        ) : null}
      </div>

      <div className="mt-2 border-t border-neutral-100 pt-2">
        <Toggle label={t("Full screen on click")} checked={slot.fullscreen} onChange={(v) => set({ fullscreen: v })} />
        <Toggle label={t("Visible")} checked={slot.visible} onChange={(v) => set({ visible: v })} />
      </div>

      <button className="mt-3 text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => setAdvanced((a) => !a)}>
        {advanced ? "▾" : "▸"} {t("Advanced (rotation, scale, overlap)")}
      </button>
      {advanced ? (
        <div className="mt-2 space-y-2 rounded-sm border border-neutral-200 bg-neutral-50 p-3">
          <Field label={`${t("Rotation")} · ${slot.rotation}°`}>
            <input type="range" min={-15} max={15} step={0.5} value={slot.rotation} onChange={(e) => set({ rotation: Number(e.target.value) }, `rot-${slot.id}`)} className="w-full" />
          </Field>
          <Field label={`${t("Scale")} · ${slot.scale.toFixed(2)}`}>
            <input type="range" min={0.5} max={1.5} step={0.01} value={slot.scale} onChange={(e) => set({ scale: Number(e.target.value) }, `scale-${slot.id}`)} className="w-full" />
          </Field>
          <Toggle label={t("Allow overlap")} checked={slot.overlap} onChange={(v) => set({ overlap: v })} />
          {slot.overlap ? <Field label={t("Layer (z-index)")}><Stepper value={slot.zIndex} min={0} max={10} onChange={(v) => set({ zIndex: v })} /></Field> : null}
          <button className="text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => set({ rotation: 0, scale: 1, overlap: false, zIndex: 0 })}>{t("Reset transforms")}</button>
          <p className="text-[10.5px] text-neutral-400">{t("Presentation only — the file is never modified.")}</p>
        </div>
      ) : null}

      {photo ? (
        <FocalModal open={focal} onClose={() => setFocal(false)} photo={photo} slot={slot} onSlot={(f) => set({ focal: f })} onPhoto={(x, y) => { mergePhotos([{ ...photo, focalX: x, focalY: y }]); void updatePhoto(photo.id, { focalX: x, focalY: y }); }} />
      ) : null}
    </div>
  );
}

function FocalModal({ open, onClose, photo, slot, onSlot, onPhoto }: { open: boolean; onClose: () => void; photo: PhotoView; slot: ImageSlot; onSlot: (f: { x: number; y: number } | null) => void; onPhoto: (x: number, y: number) => void }) {
  const t = useT();
  const [mode, setMode] = useState<"photo" | "slot">(slot.focal ? "slot" : "photo");
  const x = mode === "slot" ? slot.focal?.x ?? photo.focalX : photo.focalX;
  const y = mode === "slot" ? slot.focal?.y ?? photo.focalY : photo.focalY;
  return (
    <Modal open={open} onClose={onClose} title={t("Focal point")} width="max-w-lg" footer={<button className="ui-btn ui-btn-primary" onClick={onClose}>{t("Done")}</button>}>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <Segmented value={mode} onChange={(m) => { setMode(m); if (m === "photo") onSlot(null); }} options={[{ value: "photo", label: t("For this photo everywhere") }, { value: "slot", label: t("Only this placement") }]} />
        </div>
        <FocalPointEditor photo={photo} x={x} y={y} aspectPreview={slot.aspect !== "auto" ? slot.aspect : "16:9"} onChange={(nx, ny) => (mode === "slot" ? onSlot({ x: nx, y: ny }) : onPhoto(nx, ny))} />
        <p className="mt-3 text-[11px] text-neutral-500">{t("The focal point decides which part of the image stays visible when a layout crops it. Only two numbers are stored; the original file is untouched.")}</p>
      </div>
    </Modal>
  );
}

/** Visual 12-column bar. */
function GridBar({ span, start, onStart }: { span: number; start: number | "auto"; onStart: (s: number | "auto") => void }) {
  const t = useT();
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
              title={possible ? `${t("Position on grid")} ${col}` : ""}
              onClick={() => onStart(col)}
              className={`h-6 text-[9px] tabular-nums transition ${active ? "bg-neutral-900 text-white" : possible ? "bg-white text-neutral-400 hover:bg-neutral-100" : "bg-neutral-50 text-neutral-200"}`}
            >
              {col}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-neutral-400">
        <span>{s === null ? t("Auto") : `${t("Columns")} ${s}–${s + span - 1}`}</span>
        {s !== null ? <button type="button" className="hover:text-neutral-900" onClick={() => onStart("auto")}>{t("Auto")}</button> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block                                                                */
/* ------------------------------------------------------------------ */

function SpacingSelect({ value, onChange }: { value: Spacing; onChange: (v: Spacing) => void }) {
  const t = useT();
  return <Segmented value={value} onChange={onChange} size="sm" options={SPACING.map((s) => ({ value: s, label: s === "none" ? t("None") : spacingLabel[s] }))} />;
}

function BlockInspector({ block, onPickPhotos, collapsed, scope, projectMeta, onProjectMeta }: { block: Block; onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void; collapsed: boolean; scope: "project" | "page"; projectMeta?: ProjectMetaFields; onProjectMeta?: (patch: Partial<ProjectMetaFields>) => void }) {
  const t = useT();
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
        <span className="eyebrow">{t("Block")} · {t(BLOCK_NAME[block.type] ?? block.type)}</span>
        <span className="text-[11px] text-neutral-400">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <>
          <TypeFields block={block} onPickPhotos={onPickPhotos} projectMeta={projectMeta} onProjectMeta={onProjectMeta} />

          <div className="mt-3 border-t border-neutral-100 pt-3">
            <Field label={t("Top spacing")}><SpacingSelect value={block.spacingTop} onChange={(v) => set({ spacingTop: v })} /></Field>
            <Field label={t("Bottom spacing")}><SpacingSelect value={block.spacingBottom} onChange={(v) => set({ spacingBottom: v })} /></Field>
            <Field label={t("Background")}>
              <ColorPicker value={block.background} onChange={(v) => set({ background: v })} />
            </Field>
            <Field label={t("Text colour")}>
              <ColorPicker kind="text" value={block.textColor} onChange={(v) => set({ textColor: v })} />
            </Field>
            <Field label={t("Label (admin only)")}><input className="ui-input" value={block.label} onChange={(e) => set({ label: e.target.value }, `label-${block.id}`)} /></Field>
            <Toggle label={t("Visible")} checked={block.visible} onChange={(v) => set({ visible: v })} />
          </div>

          <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
            <button className="ui-btn" onClick={() => duplicate(block.id)}>{t("Duplicate")}</button>
            <button className="ui-btn ui-btn-danger ml-auto" onClick={() => { removeBlock(block.id); select(null); }}>{t("Remove block")}</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

const BLOCK_NAME: Record<string, string> = {
  image: "Image",
  "image-group": "Image group",
  text: "Text",
  "text-image": "Text + photo",
  spacer: "Spacer",
  chapter: "Chapter",
  "project-header": "Project header",
  "project-list": "Project list",
  "photo-archive": "Photo archive",
};

/** Font, weight, size and tracking for any block that renders text. */
function TypographyFields({ block, set }: { block: Block & { font?: string; weight?: "light" | "regular" | "medium" | "bold"; scale?: number; italic?: boolean; tracking?: number }; set: (patch: Partial<Block>, key?: string) => void }) {
  const t = useT();
  return (
    <>
      <Field label={t("Font")}>
        <FontPicker value={block.font ?? ""} onChange={(v) => set({ font: v } as Partial<Block>)} allowInherit inheritLabel={t("Auto")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {block.weight !== undefined ? (
          <Field label={t("Weight")}>
            <Segmented value={block.weight} onChange={(v) => set({ weight: v } as Partial<Block>)} size="sm" options={[{ value: "light", label: "300" }, { value: "regular", label: "400" }, { value: "medium", label: "500" }, { value: "bold", label: "700" }]} />
          </Field>
        ) : null}
        {block.scale !== undefined ? (
          <Field label={`${t("Size")} · ${(block.scale ?? 1).toFixed(2)}×`}>
            <input type="range" min={0.6} max={2.4} step={0.05} value={block.scale ?? 1} onChange={(e) => set({ scale: Number(e.target.value) } as Partial<Block>, `scale-${block.id}`)} className="w-full" />
          </Field>
        ) : null}
      </div>
      {block.tracking !== undefined ? (
        <Field label={`${t("Letter spacing")} · ${(block.tracking ?? 0).toFixed(2)}em`}>
          <input type="range" min={-0.04} max={0.3} step={0.01} value={block.tracking ?? 0} onChange={(e) => set({ tracking: Number(e.target.value) } as Partial<Block>, `track-${block.id}`)} className="w-full" />
        </Field>
      ) : null}
      {block.italic !== undefined ? <Toggle label={t("Italic")} checked={!!block.italic} onChange={(v) => set({ italic: v } as Partial<Block>)} /> : null}
    </>
  );
}

/** Name, year, location and description of the project, edited in place. */
function ProjectMetaFieldsEditor({ meta, onChange }: { meta: ProjectMetaFields; onChange: (patch: Partial<ProjectMetaFields>) => void }) {
  const t = useT();
  return (
    <>
      <Field label={t("Project name")}>
        <input className="ui-input" value={meta.name} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Year")}>
          <input className="ui-input" value={meta.year} onChange={(e) => onChange({ year: e.target.value })} />
        </Field>
        <Field label={t("Location")}>
          <input className="ui-input" value={meta.location} onChange={(e) => onChange({ location: e.target.value })} />
        </Field>
      </div>
      <Field label={t("Description")}>
        <textarea className="ui-input min-h-24" value={meta.description} onChange={(e) => onChange({ description: e.target.value })} />
      </Field>
    </>
  );
}

function TypeFields({ block, onPickPhotos, projectMeta, onProjectMeta }: { block: Block; onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void; projectMeta?: ProjectMetaFields; onProjectMeta?: (patch: Partial<ProjectMetaFields>) => void }) {
  const t = useT();
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
          <Field label={t("Layout")}>
            <button className="ui-btn w-full justify-between" onClick={() => setLayouts(true)}>
              <span>{SINGLE_LAYOUT_INFO[block.layout].number} — {SINGLE_LAYOUT_INFO[block.layout].name}</span><span>▾</span>
            </button>
          </Field>
          <LayoutPicker open={layouts} onClose={() => setLayouts(false)} kind="single" current={block.layout} onPick={(l) => updateBlock(block.id, (b: Block) => (b.type === "image" ? applySingleLayout(b, l.id as never) : b))} />
          {!block.image.photoId ? <button className="ui-btn w-full" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); updateBlock(block.id, (b: Block) => (b.type === "image" ? { ...b, image: { ...b.image, photoId: p[0].id } } : b)); } })}>{t("Select photo")}</button> : null}
          <p className="text-[10.5px] text-neutral-400">{t("Click the photograph in the canvas to edit its size, position and caption.")}</p>
        </>
      );
    case "image-group":
      return (
        <>
          <Field label={t("Layout")}>
            <button className="ui-btn w-full justify-between" onClick={() => setLayouts(true)}>
              <span>{GROUP_LAYOUT_INFO[block.layout].number} — {GROUP_LAYOUT_INFO[block.layout].name}</span><span>▾</span>
            </button>
          </Field>
          <LayoutPicker open={layouts} onClose={() => setLayouts(false)} kind="group" current={block.layout} onPick={(l) => updateBlock(block.id, (b: Block) => (b.type === "image-group" ? applyGroupLayout(b, l.id as never) : b))} />
          <Field label={t("Gap")}><SpacingSelect value={block.gap} onChange={(v) => set({ gap: v } as Partial<ImageGroupBlock>)} /></Field>
          <Field label={`${t("Photos")} · ${block.images.length}`}>
            <ul className="space-y-1">
              {block.images.map((s, i) => {
                const p = s.photoId ? photos[s.photoId] : undefined;
                return (
                  <li key={s.id} className="flex items-center gap-2 rounded-sm border border-neutral-200 bg-white p-1 text-[11px]">
                    <button className="h-8 w-10 shrink-0 overflow-hidden rounded-sm bg-neutral-100" onClick={() => select({ blockId: block.id, slotId: s.id })}>
                      {p ? <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </button>
                    <button className="min-w-0 flex-1 truncate text-left" onClick={() => select({ blockId: block.id, slotId: s.id })}>{p?.title || p?.filename || t("Empty")} · {s.span} col</button>
                    <button className="px-1 text-neutral-400 hover:text-neutral-900" disabled={i === 0} onClick={() => moveSlot(block.id, i, i - 1)}>↑</button>
                    <button className="px-1 text-neutral-400 hover:text-neutral-900" disabled={i === block.images.length - 1} onClick={() => moveSlot(block.id, i, i + 1)}>↓</button>
                    <button className="px-1 text-neutral-400 hover:text-red-600" onClick={() => removeSlot(block.id, s.id)}>✕</button>
                  </li>
                );
              })}
            </ul>
            <button className="ui-btn mt-2 w-full" onClick={() => onPickPhotos({ multiple: true, onPick: (p) => { mergePhotos(p); addSlots(block.id, p.map((x) => x.id)); } })}>{t("+ Add photos")}</button>
          </Field>
        </>
      );
    case "text":
      return (
        <>
          <Field label={t("Text")}><textarea className="ui-input min-h-32" value={block.content} onChange={(e) => set({ content: e.target.value } as never, `text-${block.id}`)} /></Field>
          <Field label={t("Style")}><Segmented value={block.variant} onChange={(v) => set({ variant: v } as never)} options={[{ value: "body", label: t("Body") }, { value: "lead", label: t("Lead") }, { value: "quote", label: t("Quote") }, { value: "small", label: t("Small") }]} /></Field>
          <TypographyFields block={block} set={set} />
          <Field label={t("Align")}><Segmented value={block.align} onChange={(v) => set({ align: v } as never)} options={[{ value: "left", label: t("Left") }, { value: "center", label: t("Center") }, { value: "right", label: t("Right") }]} /></Field>
          <Field label={t("Width")}><Stepper value={block.span} min={3} max={12} onChange={(v) => set({ span: v, start: block.start === "auto" ? "auto" : Math.min(block.start, 13 - v) } as never)} format={(v) => `${v} col`} /></Field>
          <Field label={t("Position")}><GridBar span={block.span} start={block.start} onStart={(s) => set({ start: s } as never)} /></Field>
        </>
      );
    case "text-image":
      return (
        <>
          <Field label={t("Text")}><textarea className="ui-input min-h-28" value={block.content} onChange={(e) => set({ content: e.target.value } as never, `text-${block.id}`)} /></Field>
          <TypographyFields block={block} set={set} />
          <Field label={t("Order")}><Segmented value={block.order} onChange={(v) => set({ order: v } as never)} options={[{ value: "text-first", label: t("Text + photo") }, { value: "image-first", label: t("Photo + text") }]} /></Field>
          <Field label={t("Text width")}><Stepper value={block.textSpan} min={2} max={8} onChange={(v) => set({ textSpan: v } as never)} format={(v) => `${v} col`} /></Field>
          <Field label={t("Vertical alignment")}><Segmented value={block.vAlign} onChange={(v) => set({ vAlign: v } as never)} options={[{ value: "top", label: t("Top") }, { value: "center", label: t("Center") }, { value: "bottom", label: t("Bottom") }]} /></Field>
          {!block.image.photoId ? <button className="ui-btn w-full" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); updateBlock(block.id, (b: Block) => (b.type === "text-image" ? { ...b, image: { ...b.image, photoId: p[0].id } } : b)); } })}>{t("Select photo")}</button> : null}
        </>
      );
    case "spacer":
      return <Field label={t("Size")}><SpacingSelect value={block.size} onChange={(v) => set({ size: v } as never)} /></Field>;
    case "chapter":
      return (
        <>
          <Field label={t("Number")}><input className="ui-input" value={block.number} onChange={(e) => set({ number: e.target.value } as never, `n-${block.id}`)} placeholder="01" /></Field>
          <Field label={t("Title")}><input className="ui-input" value={block.title} onChange={(e) => set({ title: e.target.value } as never, `t-${block.id}`)} /></Field>
          <Field label={t("Subtitle")}><input className="ui-input" value={block.subtitle} onChange={(e) => set({ subtitle: e.target.value } as never, `s-${block.id}`)} /></Field>
          <TypographyFields block={block} set={set} />
          <Field label={t("Align")}><Segmented value={block.align} onChange={(v) => set({ align: v } as never)} options={[{ value: "left", label: t("Left") }, { value: "center", label: t("Center") }, { value: "right", label: t("Right") }]} /></Field>
        </>
      );
    case "project-header":
      return (
        <>
          {projectMeta && onProjectMeta ? <ProjectMetaFieldsEditor meta={projectMeta} onChange={onProjectMeta} /> : null}
          <div className="my-3 border-t border-neutral-100" />
          <TypographyFields block={block} set={set} />
          <Toggle label={t("Show index number")} checked={block.showIndex} onChange={(v) => set({ showIndex: v } as never)} />
          <Toggle label={t("Show title")} checked={block.showTitle} onChange={(v) => set({ showTitle: v } as never)} />
          <Toggle label={t("Show year / location / category")} checked={block.showMeta} onChange={(v) => set({ showMeta: v } as never)} />
          <Toggle label={t("Show description")} checked={block.showDescription} onChange={(v) => set({ showDescription: v } as never)} />
          <Field label={t("Align")}><Segmented value={block.align} onChange={(v) => set({ align: v } as never)} options={[{ value: "left", label: t("Left") }, { value: "center", label: t("Center") }, { value: "right", label: t("Right") }]} /></Field>
          <p className="text-[10.5px] text-neutral-400">{t("Cover, category and SEO live in Project settings, in the top bar.")}</p>
        </>
      );
    case "project-list":
      return (
        <>
          <Field label={t("Source")}><Segmented value={block.source} onChange={(v) => set({ source: v } as never)} options={[{ value: "home", label: t("Show on home") }, { value: "featured", label: t("Featured") }, { value: "all", label: t("All") }]} /></Field>
          <Field label={t("Style")}><Segmented value={block.style} onChange={(v) => set({ style: v } as never)} options={[{ value: "editorial", label: t("Editorial") }, { value: "grid", label: t("Grid") }, { value: "index", label: t("Index") }]} /></Field>
          <Field label={t("Limit (0 = all)")}><Stepper value={block.limit} min={0} max={50} onChange={(v) => set({ limit: v } as never)} /></Field>
          <Toggle label={t("Show year / location")} checked={block.showMeta} onChange={(v) => set({ showMeta: v } as never)} />
          <p className="text-[10.5px] text-neutral-400">{t("Order follows the Projects list (drag to reorder there). Only published projects appear.")}</p>
        </>
      );
    case "photo-archive":
      return (
        <>
          <Field label={t("Columns")}><Segmented value={block.columns} onChange={(v) => set({ columns: v } as never)} options={[2, 3, 4, 6].map((n) => ({ value: n, label: String(n) }))} /></Field>
          <Field label={t("Sort")}>
            <select className="ui-input" value={block.sort} onChange={(e) => set({ sort: e.target.value } as never)}>
              <option value="manual">{t("Manual (archive order)")}</option>
              <option value="newest">{t("Newest first")}</option>
              <option value="oldest">{t("Oldest first")}</option>
              <option value="year-desc">{t("Year")} ↓</option>
              <option value="year-asc">{t("Year")} ↑</option>
              <option value="title">{t("Title")}</option>
            </select>
          </Field>
          <Toggle label={t("Show category / year filters")} checked={block.showFilters} onChange={(v) => set({ showFilters: v } as never)} />
          <Toggle label={t("Show captions")} checked={block.showCaptions} onChange={(v) => set({ showCaptions: v } as never)} />
          <p className="text-[10.5px] text-neutral-400">{t("Which photos appear is controlled per photo (“Show in archive”) in the library. Manual order: Archive settings.")}</p>
        </>
      );
  }
}

export function LayoutPicker({ open, onClose, kind, current, onPick }: { open: boolean; onClose: () => void; kind: "single" | "group" | "all"; current?: string; onPick: (l: LayoutInfo) => void }) {
  const t = useT();
  const list = [...(kind !== "group" ? Object.values(SINGLE_LAYOUT_INFO) : []), ...(kind !== "single" ? Object.values(GROUP_LAYOUT_INFO) : [])];
  return (
    <Modal open={open} onClose={onClose} title={t("Layout")} width="max-w-3xl">
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
