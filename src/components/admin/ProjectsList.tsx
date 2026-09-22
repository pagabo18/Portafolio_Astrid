"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/client/api";
import type { PhotoView } from "@/lib/photos/view";
import { ConfirmDialog, Modal } from "./ui/Modal";
import { Field, Toggle } from "./ui/Fields";
import { PhotoPicker } from "./PhotoPicker";

export type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  year: string;
  location: string;
  status: string;
  featured: boolean;
  showOnHome: boolean;
  showInArchive: boolean;
  photoCount: number;
  hasUnpublished: boolean;
  coverUrl: string | null;
  updatedAt: string;
  previewToken: string;
};

export function ProjectsList({ initial, categories, openNew }: { initial: ProjectRow[]; categories: { id: string; name: string }[]; openNew: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [showNew, setShowNew] = useState(openNew);
  const [del, setDel] = useState<ProjectRow | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(rows, rows.findIndex((r) => r.id === active.id), rows.findIndex((r) => r.id === over.id));
    setRows(next);
    await api("/api/admin/projects/reorder", { method: "PUT", json: { ids: next.map((r) => r.id) } });
  }

  async function patch(id: string, p: Partial<ProjectRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
    await api(`/api/admin/projects/${id}`, { method: "PATCH", json: p });
    router.refresh();
  }

  async function duplicate(id: string) {
    const p = await api<{ id: string }>(`/api/admin/projects/${id}/duplicate`, { method: "POST" });
    router.push(`/admin/projects/${p.id}`);
  }

  async function remove(id: string) {
    await api(`/api/admin/projects/${id}`, { method: "DELETE" });
    setRows((rs) => rs.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">Projects</div>
          <h1 className="mt-1 text-2xl font-light">{rows.length} project{rows.length === 1 ? "" : "s"}</h1>
        </div>
        <button className="ui-btn ui-btn-primary" onClick={() => setShowNew(true)}>+ New project</button>
      </div>

      {!rows.length ? (
        <div className="ui-card px-6 py-16 text-center text-[12.5px] text-neutral-500">
          No projects yet. Create one, pick photographs and a first editorial layout is proposed automatically.
        </div>
      ) : (
        <DndContext id="projects-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="ui-card divide-y divide-neutral-100">
              {rows.map((r) => (
                <Row key={r.id} row={r} onPatch={patch} onDuplicate={duplicate} onDelete={() => setDel(r)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="mt-3 text-[11px] text-neutral-400">Drag ≡ to change the order projects appear on the site.</p>

      <NewProjectWizard open={showNew} onClose={() => setShowNew(false)} categories={categories} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete “${del?.name}”?`}
        message="The project page and its layout are removed. Photographs stay in the library."
        onConfirm={async () => { if (del) await remove(del.id); }}
      />
    </div>
  );
}

function Row({ row, onPatch, onDuplicate, onDelete }: { row: ProjectRow; onPatch: (id: string, p: Partial<ProjectRow>) => void; onDuplicate: (id: string) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const [menu, setMenu] = useState(false);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-4 px-4 py-3 ${isDragging ? "bg-neutral-50 shadow" : ""}`}>
      <button {...attributes} {...listeners} className="cursor-grab text-neutral-300 hover:text-neutral-700" title="Drag to reorder">≡</button>
      <Link href={`/admin/projects/${row.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">
          {row.coverUrl ? <img src={row.coverUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px]">{row.name}</div>
          <div className="text-[11px] text-neutral-500">{[row.year, row.location, `${row.photoCount} photos`].filter(Boolean).join(" · ")} · /projects/{row.slug}</div>
        </div>
      </Link>
      <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-wider">
        {row.hasUnpublished && row.status === "published" ? <span className="text-amber-700">Changes</span> : null}
        <span className={row.status === "published" ? "text-emerald-700" : row.status === "archived" ? "text-neutral-400" : "text-neutral-500"}>{row.status}</span>
        {row.featured ? <span className="text-neutral-400">★</span> : null}
      </div>
      <div className="relative">
        <button className="ui-btn ui-btn-ghost h-7 px-2" onClick={() => setMenu((m) => !m)}>···</button>
        {menu ? (
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-sm border border-neutral-200 bg-white py-1 text-[12px] shadow-lg" onMouseLeave={() => setMenu(false)}>
            <Link href={`/admin/projects/${row.id}`} className="block px-3 py-1.5 hover:bg-neutral-50">Edit</Link>
            <a href={`/preview/project/${row.slug}?token=${row.previewToken}`} target="_blank" rel="noreferrer" className="block px-3 py-1.5 hover:bg-neutral-50">Preview draft ↗</a>
            {row.status === "published" ? <a href={`/projects/${row.slug}`} target="_blank" rel="noreferrer" className="block px-3 py-1.5 hover:bg-neutral-50">View live ↗</a> : null}
            <div className="my-1 border-t border-neutral-100" />
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onPatch(row.id, { featured: !row.featured })}>{row.featured ? "Remove from featured" : "Mark as featured"}</button>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onPatch(row.id, { showOnHome: !row.showOnHome })}>{row.showOnHome ? "Hide from home" : "Show on home"}</button>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onPatch(row.id, { showInArchive: !row.showInArchive })}>{row.showInArchive ? "Hide from archive" : "Show in archive"}</button>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onPatch(row.id, { status: row.status === "archived" ? "draft" : "archived" })}>{row.status === "archived" ? "Unarchive (hidden → draft)" : "Hide (archive project)"}</button>
            <div className="my-1 border-t border-neutral-100" />
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onDuplicate(row.id)}>Duplicate</button>
            <button className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50" onClick={onDelete}>Delete…</button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** NEW PROJECT → name → select photos → automatic first proposal → editor. */
function NewProjectWizard({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: "", year: String(new Date().getFullYear()), location: "", description: "", categoryId: "", autoLayout: true });
  const [photos, setPhotos] = useState<PhotoView[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const p = await api<{ id: string }>("/api/admin/projects", {
        method: "POST",
        json: { ...form, categoryId: form.categoryId || null, photoIds: photos.map((p) => p.id) },
      });
      router.push(`/admin/projects/${p.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={step === 1 ? "New project" : `New project — ${form.name}`}
        width="max-w-2xl"
        footer={
          step === 1 ? (
            <>
              <button className="ui-btn" onClick={onClose}>Cancel</button>
              <button className="ui-btn ui-btn-primary" disabled={!form.name.trim()} onClick={() => setStep(2)}>Next: select photos →</button>
            </>
          ) : (
            <>
              <button className="ui-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="ui-btn ui-btn-primary" disabled={busy} onClick={create}>{busy ? "Creating…" : photos.length ? `Create with ${photos.length} photos` : "Create empty project"}</button>
            </>
          )
        }
      >
        {step === 1 ? (
          <div className="grid grid-cols-2 gap-x-4 p-5">
            <div className="col-span-2">
              <Field label="Project name">
                <input className="ui-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enduro 2026" />
              </Field>
            </div>
            <Field label="Year"><input className="ui-input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
            <Field label="Location"><input className="ui-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Guadalajara, Mexico" /></Field>
            <div className="col-span-2">
              <Field label="Category">
                <select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Description"><textarea className="ui-input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] text-neutral-600">{photos.length ? `${photos.length} photographs selected — drag order is kept.` : "Choose the photographs for this project. A first editorial composition is generated from their orientation and tone."}</p>
              <button className="ui-btn" onClick={() => setPicker(true)}>{photos.length ? "Change selection" : "Select photos"}</button>
            </div>
            {photos.length ? (
              <div className="grid grid-cols-6 gap-2">
                {photos.map((p, i) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-sm bg-neutral-100"> <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded-sm bg-black/60 px-1 text-[9px] text-white">{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <Toggle label="Generate a first editorial layout automatically" checked={form.autoLayout} onChange={(v) => setForm({ ...form, autoLayout: v })} />
          </div>
        )}
      </Modal>
      <PhotoPicker open={picker} onClose={() => setPicker(false)} onPick={setPhotos} initialSelected={photos.map((p) => p.id)} title="Select photographs for the project" />
    </>
  );
}
