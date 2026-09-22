"use client";

import { useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PhotoView } from "@/lib/photos/view";
import { setArchiveOrder, updatePhoto } from "@/lib/content/admin";
import { Modal } from "@/components/admin/ui/Modal";

/** Archive settings: drag photographs to set the manual order; toggle visibility. */
export function ArchiveOrderModal({ open, onClose, photos, onChange }: { open: boolean; onClose: () => void; photos: PhotoView[]; onChange: (p: PhotoView[]) => void }) {
  const [list, setList] = useState(photos);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(list, list.findIndex((p) => p.id === active.id), list.findIndex((p) => p.id === over.id)).map((p, i) => ({ ...p, archiveOrder: i }));
    setList(next);
    onChange(next);
    await setArchiveOrder(next.map((p) => p.id));
  }
  async function toggle(p: PhotoView) {
    const next = list.map((x) => (x.id === p.id ? { ...x, showInArchive: !x.showInArchive } : x));
    setList(next);
    onChange(next);
    await updatePhoto(p.id, { showInArchive: !p.showInArchive });
  }
  return (
    <Modal open={open} onClose={onClose} title="Archive · order & visibility" width="max-w-4xl" footer={<button className="ui-btn ui-btn-primary" onClick={onClose}>Done</button>}>
      <div className="p-4">
        <p className="mb-3 text-[11.5px] text-neutral-500">Drag to set the manual order. Click the eye to include or exclude a photograph. Order and visibility are saved immediately and go live with the next deploy.</p>
        <DndContext id="archive-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={list.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-8 gap-2">
              {list.map((p, i) => <Cell key={p.id} p={p} i={i} onToggle={() => toggle(p)} />)}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </Modal>
  );
}

function Cell({ p, i, onToggle }: { p: PhotoView; i: number; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`relative aspect-square overflow-hidden rounded-sm bg-neutral-100 ${isDragging ? "z-10 shadow-lg" : ""} ${!p.showInArchive ? "opacity-40" : ""}`}> <img src={p.thumbUrl} alt="" className="h-full w-full cursor-grab object-cover" {...attributes} {...listeners} />
      <span className="absolute left-1 top-1 rounded-sm bg-black/60 px-1 text-[9px] text-white">{i + 1}</span>
      <button onClick={onToggle} className="absolute bottom-1 right-1 rounded-sm bg-black/60 px-1 text-[10px] text-white" title={p.showInArchive ? "Exclude from archive" : "Include in archive"}>{p.showInArchive ? "◉" : "◌"}</button>
    </div>
  );
}
