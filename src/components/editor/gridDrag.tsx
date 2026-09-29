"use client";

import { useCallback, useRef, useState } from "react";

export type GridValue = { span: number; start: number | "auto"; offsetY: number };
export type GridPatch = Partial<GridValue> & { anchorX?: "custom" };
export type DragMode = "move" | "left" | "right";

/** Width of one column plus its gap, measured from the live grid. */
function unitOf(grid: Element): number {
  const rect = grid.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(grid).columnGap || "0") || 0;
  return (rect.width + gap) / 12;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Drag a box around the 12 column grid: move it, or pull an edge to resize.
 * Everything snaps to columns and to vertical grid units, so a composition
 * dragged by hand stays responsive.
 */
export function useGridDrag({
  value,
  onChange,
  onSelect,
  enabled,
  id,
}: {
  value: GridValue;
  onChange: (patch: GridPatch, key: string) => void;
  onSelect?: () => void;
  enabled: boolean;
  id: string;
}) {
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const state = useRef<{
    mode: DragMode;
    unit: number;
    x: number;
    y: number;
    span: number;
    start: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, mode: DragMode = "move") => {
      if (!enabled || e.button !== 0) return;
      const el = e.currentTarget as HTMLElement;
      const grid = el.closest(".ed-grid");
      if (!grid) return;
      e.stopPropagation();
      onSelect?.();
      const unit = unitOf(grid);
      // where the box sits right now, so "auto" placement can be picked up
      const start =
        value.start === "auto"
          ? clamp(Math.round((el.getBoundingClientRect().left - grid.getBoundingClientRect().left) / unit) + 1, 1, 12)
          : value.start;
      state.current = { mode, unit, x: e.clientX, y: e.clientY, span: value.span, start, offsetY: value.offsetY, moved: false };
      el.setPointerCapture(e.pointerId);
      setDragging(mode);
    },
    [enabled, onSelect, value.span, value.start, value.offsetY],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = state.current;
      if (!s) return;
      const dCols = Math.round((e.clientX - s.x) / s.unit);
      const dRows = Math.round((e.clientY - s.y) / s.unit);
      if (!s.moved && Math.abs(e.clientX - s.x) < 4 && Math.abs(e.clientY - s.y) < 4) return;
      s.moved = true;
      const key = `drag-${id}`;
      if (s.mode === "move") {
        const start = clamp(s.start + dCols, 1, 13 - s.span);
        const offsetY = clamp(s.offsetY + dRows, -4, 4);
        onChange({ start, offsetY, anchorX: "custom" }, key);
        return;
      }
      if (s.mode === "right") {
        const span = clamp(s.span + dCols, 1, 13 - s.start);
        onChange({ span, start: s.start, anchorX: "custom" }, key);
        return;
      }
      const start = clamp(s.start + dCols, 1, s.start + s.span - 1);
      onChange({ start, span: s.span + (s.start - start), anchorX: "custom" }, key);
    },
    [id, onChange],
  );

  const end = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!state.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* the pointer may already be gone */
    }
    state.current = null;
    setDragging(null);
  }, []);

  return {
    dragging,
    /** Spread on the box itself. */
    handlers: enabled
      ? { onPointerDown: (e: React.PointerEvent<HTMLElement>) => onPointerDown(e, "move"), onPointerMove, onPointerUp: end, onPointerCancel: end }
      : {},
    /** Spread on an edge handle. */
    edgeHandlers: (mode: DragMode) =>
      enabled
        ? {
            onPointerDown: (e: React.PointerEvent<HTMLElement>) => onPointerDown(e, mode),
            onPointerMove,
            onPointerUp: end,
            onPointerCancel: end,
          }
        : {},
  };
}

/** The little squares shown on a selected box. */
export function EdgeHandles({ edgeHandlers }: { edgeHandlers: (m: DragMode) => Record<string, unknown> }) {
  return (
    <>
      <span className="ed-handle ed-handle-l" {...edgeHandlers("left")} />
      <span className="ed-handle ed-handle-r" {...edgeHandlers("right")} />
    </>
  );
}
