"use client";

import { create } from "zustand";
import type { Block, BlocksDocument, ImageSlot } from "@/lib/blocks/schema";
import { newSlot } from "@/lib/blocks/schema";
import { duplicateBlock } from "@/lib/blocks/templates";
import type { PhotoMap, PhotoView } from "@/lib/photos/view";
import type { Selection } from "@/components/editorial/types";

export type SaveState = "saved" | "unsaved" | "saving" | "error";
export type Device = "desktop" | "tablet" | "mobile";

type HistoryEntry = { doc: BlocksDocument; key?: string; at: number };

export type EditorState = {
  doc: BlocksDocument;
  past: HistoryEntry[];
  future: HistoryEntry[];
  selection: Selection;
  photos: PhotoMap;
  saveState: SaveState;
  device: Device;
  showGrid: boolean;
  dirty: boolean;

  init: (doc: BlocksDocument, photos: PhotoMap) => void;
  setDoc: (doc: BlocksDocument, opts?: { key?: string; silent?: boolean }) => void;
  updateBlock: (id: string, patch: Partial<Block> | ((b: Block) => Block), key?: string) => void;
  updateSlot: (blockId: string, slotId: string, patch: Partial<ImageSlot> | ((s: ImageSlot) => ImageSlot), key?: string) => void;
  insertBlock: (block: Block, afterId?: string | null) => void;
  removeBlock: (id: string) => void;
  duplicate: (id: string) => void;
  moveBlock: (from: number, to: number) => void;
  addSlots: (blockId: string, photoIds: string[]) => void;
  removeSlot: (blockId: string, slotId: string) => void;
  moveSlot: (blockId: string, from: number, to: number) => void;
  undo: () => void;
  redo: () => void;
  select: (sel: Selection) => void;
  mergePhotos: (list: PhotoView[]) => void;
  setSaveState: (s: SaveState) => void;
  setDevice: (d: Device) => void;
  toggleGrid: () => void;
  markSaved: () => void;
};

const MAX_HISTORY = 120;
const COALESCE_MS = 900;

export const useEditor = create<EditorState>((set, get) => ({
  doc: { version: 1, blocks: [] },
  past: [],
  future: [],
  selection: null,
  photos: {},
  saveState: "saved",
  device: "desktop",
  showGrid: false,
  dirty: false,

  init: (doc, photos) => set({ doc, photos, past: [], future: [], selection: null, saveState: "saved", dirty: false }),

  setDoc: (doc, opts = {}) => {
    const { doc: cur, past } = get();
    const now = Date.now();
    const last = past[past.length - 1];
    const coalesce = opts.key && last && last.key === opts.key && now - last.at < COALESCE_MS;
    const nextPast = coalesce ? past : [...past, { doc: cur, key: opts.key, at: now }].slice(-MAX_HISTORY);
    set({ doc, past: coalesce ? nextPast.map((e, i) => (i === nextPast.length - 1 ? { ...e, at: now } : e)) : nextPast, future: [], saveState: opts.silent ? get().saveState : "unsaved", dirty: !opts.silent });
  },

  updateBlock: (id, patch, key) => {
    const { doc, setDoc } = get();
    setDoc(
      {
        ...doc,
        blocks: doc.blocks.map((b) => (b.id === id ? (typeof patch === "function" ? patch(b) : ({ ...b, ...patch } as Block)) : b)),
      },
      { key },
    );
  },

  updateSlot: (blockId, slotId, patch, key) => {
    const apply = (s: ImageSlot) => (typeof patch === "function" ? patch(s) : { ...s, ...patch });
    get().updateBlock(
      blockId,
      (b: Block) => {
        if ((b.type === "image" || b.type === "text-image") && b.image.id === slotId) return { ...b, image: apply(b.image) };
        if (b.type === "image-group") return { ...b, images: b.images.map((s) => (s.id === slotId ? apply(s) : s)) };
        return b;
      },
      key,
    );
  },

  insertBlock: (block, afterId) => {
    const { doc, setDoc } = get();
    const blocks = [...doc.blocks];
    const idx = afterId ? blocks.findIndex((b) => b.id === afterId) : -1;
    if (idx >= 0) blocks.splice(idx + 1, 0, block);
    else blocks.push(block);
    setDoc({ ...doc, blocks });
    set({ selection: { blockId: block.id } });
  },

  removeBlock: (id) => {
    const { doc, setDoc, selection } = get();
    setDoc({ ...doc, blocks: doc.blocks.filter((b) => b.id !== id) });
    if (selection?.blockId === id) set({ selection: null });
  },

  duplicate: (id) => {
    const { doc, setDoc } = get();
    const idx = doc.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const copy = duplicateBlock(doc.blocks[idx]);
    const blocks = [...doc.blocks];
    blocks.splice(idx + 1, 0, copy);
    setDoc({ ...doc, blocks });
    set({ selection: { blockId: copy.id } });
  },

  moveBlock: (from, to) => {
    const { doc, setDoc } = get();
    if (from === to || from < 0 || to < 0 || from >= doc.blocks.length || to >= doc.blocks.length) return;
    const blocks = [...doc.blocks];
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
    setDoc({ ...doc, blocks });
  },

  addSlots: (blockId, photoIds) => {
    get().updateBlock(blockId, (b: Block) => {
      if (b.type !== "image-group") return b;
      const n = b.images.length;
      const span = n + photoIds.length >= 4 ? 3 : n + photoIds.length === 3 ? 4 : 6;
      return { ...b, images: [...b.images, ...photoIds.map((photoId) => newSlot({ photoId, span, start: "auto" }))] };
    });
  },

  removeSlot: (blockId, slotId) => {
    get().updateBlock(blockId, (b: Block) => (b.type === "image-group" ? { ...b, images: b.images.filter((s) => s.id !== slotId) } : b));
    const sel = get().selection;
    if (sel?.slotId === slotId) set({ selection: { blockId } });
  },

  moveSlot: (blockId, from, to) => {
    get().updateBlock(blockId, (b: Block) => {
      if (b.type !== "image-group") return b;
      const images = [...b.images];
      const [s] = images.splice(from, 1);
      images.splice(to, 0, s);
      return { ...b, images };
    });
  },

  undo: () => {
    const { past, future, doc } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ doc: prev.doc, past: past.slice(0, -1), future: [{ doc, at: Date.now() }, ...future].slice(0, MAX_HISTORY), saveState: "unsaved", dirty: true });
  },
  redo: () => {
    const { past, future, doc } = get();
    const next = future[0];
    if (!next) return;
    set({ doc: next.doc, future: future.slice(1), past: [...past, { doc, at: Date.now() }].slice(-MAX_HISTORY), saveState: "unsaved", dirty: true });
  },

  select: (selection) => set({ selection }),
  mergePhotos: (list) => set((s) => ({ photos: { ...s.photos, ...Object.fromEntries(list.map((p) => [p.id, p])) } })),
  setSaveState: (saveState) => set({ saveState }),
  setDevice: (device) => set({ device }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  markSaved: () => set({ saveState: "saved", dirty: false }),
}));

/** Find a block and (optionally) a slot for the current selection. */
export function findSelected(doc: BlocksDocument, sel: Selection): { block: Block | null; slot: ImageSlot | null } {
  if (!sel) return { block: null, slot: null };
  const block = doc.blocks.find((b) => b.id === sel.blockId) ?? null;
  let slot: ImageSlot | null = null;
  if (block && sel.slotId) {
    if ((block.type === "image" || block.type === "text-image") && block.image.id === sel.slotId) slot = block.image;
    if (block.type === "image-group") slot = block.images.find((s) => s.id === sel.slotId) ?? null;
  }
  return { block, slot };
}
