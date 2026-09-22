"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Block } from "@/lib/blocks/schema";
import type { EditorHooks } from "./types";

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
  } as CSSProperties;
  return (
    <section
      className={`ed-block ${className ?? ""}`}
      style={style}
      data-block-id={block.id}
      data-block-type={block.type}
      data-block-index={index}
      data-bg={block.background}
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
