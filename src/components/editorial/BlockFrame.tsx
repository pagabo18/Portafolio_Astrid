"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Block } from "@/lib/blocks/schema";
import { isDarkBackground, resolveBackground, resolveText } from "@/lib/design/colors";
import type { EditorHooks } from "./types";

/** Colour tokens for a block, derived from its background and text colour. */
export function blockColorStyle(block: Pick<Block, "background" | "textColor">): CSSProperties {
  const s: Record<string, string> = {};
  const bg = resolveBackground(block.background);
  if (bg) s["--block-bg"] = bg;
  const dark = isDarkBackground(block.background);
  if (dark) {
    s["--ink"] = "#e9e6df";
    s["--ink-2"] = "#b8b4ac";
    s["--ink-3"] = "#7d7a74";
    s["--line"] = "rgba(255,255,255,0.14)";
  }
  const text = resolveText(block.textColor);
  if (text) {
    s["--ink"] = text;
    s["--ink-2"] = `color-mix(in srgb, ${text} 72%, transparent)`;
    s["--ink-3"] = `color-mix(in srgb, ${text} 48%, transparent)`;
    s["--line"] = `color-mix(in srgb, ${text} 20%, transparent)`;
  }
  if (s["--ink"]) s.color = "var(--ink)";
  return s as CSSProperties;
}

export function BlockFrame({
  block,
  editor,
  children,
  className,
  index,
}: {
  block: Block;
  editor?: EditorHooks;
  children: ReactNode;
  className?: string;
  index: number;
}) {
  if (!block.visible && !editor) return null;
  const selected = editor?.selection?.blockId === block.id && !editor?.selection?.slotId;
  const style = {
    "--sp-top": `var(--sp-${block.spacingTop})`,
    "--sp-bottom": `var(--sp-${block.spacingBottom})`,
    ...blockColorStyle(block),
  } as CSSProperties;
  return (
    <section
      className={`ed-block ${className ?? ""}`}
      style={style}
      data-block-id={block.id}
      data-block-type={block.type}
      data-block-index={index}
      data-visible={block.visible ? "true" : "false"}
      data-selected={selected ? "true" : undefined}
      onClick={
        editor
          ? (e) => {
              e.stopPropagation();
              editor.onSelect({ blockId: block.id });
            }
          : undefined
      }
    >
      {editor?.showGrid ? (
        <div className="ed-gridlines" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      ) : null}
      {children}
    </section>
  );
}
