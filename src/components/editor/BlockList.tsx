"use client";

import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block } from "@/lib/blocks/schema";
import { GROUP_LAYOUT_INFO, SINGLE_LAYOUT_INFO } from "@/lib/blocks/templates";
import { useEditor } from "./store";

export function blockLabel(b: Block) {
  if (b.label) return b.label;
  switch (b.type) {
    case "image":
      return SINGLE_LAYOUT_INFO[b.layout].name;
    case "image-group":
      return `${GROUP_LAYOUT_INFO[b.layout].name} · ${b.images.length}`;
    case "text":
      return b.content ? `Text · ${b.content.slice(0, 24)}${b.content.length > 24 ? "…" : ""}` : "Text";
    case "text-image":
      return "Text + photo";
    case "spacer":
      return `Spacer · ${b.size.toUpperCase()}`;
    case "chapter":
      return b.title ? `Chapter · ${b.title}` : "Chapter";
    case "project-header":
      return "Project header";
    case "project-list":
      return `Project list · ${b.style}`;
    case "photo-archive":
      return "Photo archive";
  }
}

export function BlockList({ onAdd }: { onAdd: (afterId: string | null) => void }) {
  const doc = useEditor((s) => s.doc);
  const photos = useEditor((s) => s.photos);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const moveBlock = useEditor((s) => s.moveBlock);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    moveBlock(doc.blocks.findIndex((b) => b.id === active.id), doc.blocks.findIndex((b) => b.id === over.id));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="eyebrow">Blocks · {doc.blocks.length}</span>
        <button className="ui-btn h-6 px-2 text-[11px]" onClick={() => onAdd(null)}>+ Add</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <DndContext id="blocks-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={doc.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-0.5">
              {doc.blocks.map((b, i) => (
                <Item
                  key={b.id}
                  block={b}
                  index={i}
                  thumbs={
                    b.type === "image" || b.type === "text-image"
                      ? [b.image.photoId ? photos[b.image.photoId]?.thumbUrl : undefined]
                      : b.type === "image-group"
                        ? b.images.map((s) => (s.photoId ? photos[s.photoId]?.thumbUrl : undefined))
                        : []
                  }
                  selected={selection?.blockId === b.id}
                  onSelect={() => select({ blockId: b.id })}
                  onAddAfter={() => onAdd(b.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {!doc.blocks.length ? <p className="px-2 py-6 text-center text-[11px] text-neutral-400">No blocks yet.</p> : null}
        <button className="mt-2 w-full rounded-sm border border-dashed border-neutral-300 py-2 text-[11px] text-neutral-500 hover:border-neutral-500 hover:text-neutral-900" onClick={() => onAdd(null)}>
          + Add block
        </button>
      </div>
    </div>
  );
}

function Item({ block, index, thumbs, selected, onSelect, onAddAfter }: { block: Block; index: number; thumbs: (string | undefined)[]; selected: boolean; onSelect: () => void; onAddAfter: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-2 rounded-sm px-1.5 py-1 text-[12px] ${selected ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"} ${isDragging ? "opacity-70 shadow-lg" : ""} ${!block.visible ? "opacity-50" : ""}`}
      onClick={onSelect}
    >
      <button {...attributes} {...listeners} className={`cursor-grab px-0.5 ${selected ? "text-white/60" : "text-neutral-300 group-hover:text-neutral-600"}`} title="Drag to reorder" onClick={(e) => e.stopPropagation()}>
        ≡
      </button>
      <span className={`w-5 shrink-0 text-[10px] tabular-nums ${selected ? "text-white/60" : "text-neutral-400"}`}>{String(index + 1).padStart(2, "0")}</span>
      <span className="flex shrink-0 -space-x-1">
        {thumbs.slice(0, 3).map((t, i) =>
          t ? ( <img key={i} src={t} alt="" className="h-5 w-5 rounded-sm border border-white object-cover" />
          ) : (
            <span key={i} className="h-5 w-5 rounded-sm border border-dashed border-neutral-300 bg-white/50" />
          ),
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">{blockLabel(block)}</span>
      {!block.visible ? <span className="text-[9px] uppercase tracking-wider">hidden</span> : null}
      <button
        className={`hidden h-5 w-5 rounded-sm text-[13px] leading-none group-hover:block ${selected ? "hover:bg-white/20" : "hover:bg-neutral-200"}`}
        title="Add block after"
        onClick={(e) => {
          e.stopPropagation();
          onAddAfter();
        }}
      >
        +
      </button>
    </li>
  );
}
