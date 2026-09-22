"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PhotoView } from "@/lib/photos/view";
import { createProject, deleteProject, duplicateProject, projectHasUnpublished, reorderProjects, updateProjectFlags, useAdminState, viewMap, type ProjectEntry, type ProjectFlagsPatch } from "@/lib/content/admin";
import { withBase } from "@/lib/content/paths";
import { ConfirmDialog, Modal } from "./ui/Modal";
import { Field, Toggle } from "./ui/Fields";
import { PhotoPicker } from "./PhotoPicker";

export function ProjectsList() {
  const router = useRouter();
  const params = useSearchParams();
  const projects = useAdminState((s) => s.projects);
  const categories = useAdminState((s) => s.categories);
  const records = useAdminState((s) => s.photos);
  const covers = useMemo(() => viewMap(projects.map((p) => p.draft.meta.coverPhotoId ?? "").filter(Boolean)), [projects, records]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showNew, setShowNew] = useState(params.get("new") === "1");
  const slugParam = params.get("slug");
  const bySlug = slugParam ? projects.find((p) => p.file.slug === slugParam) : null;
  useEffect(() => {
    if (bySlug) router.replace(`/admin/editor?type=project&id=${bySlug.file.id}`);
  }, [bySlug, router]);
  const [del, setDel] = useState<ProjectEntry | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const next = arrayMove(projects, projects.findIndex((r) => r.file.id === active.id), projects.findIndex((r) => r.file.id === over.id));
    await reorderProjects(next.map((r) => r.file.id));
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">Projects</div>
          <h1 className="mt-1 text-2xl font-light">{projects.length} project{projects.length === 1 ? "" : "s"}</h1>
        </div>
        <button className="ui-btn ui-btn-primary" onClick={() => setShowNew(true)}>+ New project</button>
      </div>

      {!projects.length ? (
        <div className="ui-card px-6 py-16 text-center text-[12.5px] text-neutral-500">No projects yet. Create one, pick photographs and a first editorial layout is proposed automatically.</div>
      ) : (
        <DndContext id="projects-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={projects.map((r) => r.file.id)} strategy={verticalListSortingStrategy}>
            <ul className="ui-card divide-y divide-neutral-100">
              {projects.map((r) => (
                <Row key={r.file.id} entry={r} coverUrl={r.draft.meta.coverPhotoId ? covers[r.draft.meta.coverPhotoId]?.thumbUrl ?? null : null} onFlags={(p) => updateProjectFlags(r.file.id, p)} onDuplicate={async () => { const d = await duplicateProject(r.file.id); router.push(`/admin/editor?type=project&id=${d.file.id}`); }} onDelete={() => setDel(r)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="mt-3 text-[11px] text-neutral-400">Drag ≡ to change the order projects appear on the site.</p>

      <NewProjectWizard open={showNew} onClose={() => setShowNew(false)} categories={categories} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title={`Delete “${del?.draft.meta.name}”?`} message="The project page and its layout are removed. Photographs stay in the library." onConfirm={async () => { if (del) await deleteProject(del.file.id); }} />
    </div>
  );
}

function Row({ entry, coverUrl, onFlags, onDuplicate, onDelete }: { entry: ProjectEntry; coverUrl: string | null; onFlags: (p: ProjectFlagsPatch) => void; onDuplicate: () => void; onDelete: () => void }) {
  const { file, draft } = entry;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: file.id });
  const [menu, setMenu] = useState(false);
  const editHref = `/admin/editor?type=project&id=${file.id}`;
  const unpublished = projectHasUnpublished(entry);
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-4 px-4 py-3 ${isDragging ? "bg-neutral-50 shadow" : ""}`}>
      <button {...attributes} {...listeners} className="cursor-grab text-neutral-300 hover:text-neutral-700" title="Drag to reorder">≡</button>
      <Link href={editHref} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-100">{coverUrl ? <img src={coverUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
        <div className="min-w-0">
          <div className="truncate text-[13.5px]">{draft.meta.name}</div>
          <div className="text-[11px] text-neutral-500">{[draft.meta.year, draft.meta.location, `${file.photoIds.length} photos`].filter(Boolean).join(" · ")} · /projects/{file.slug}</div>
        </div>
      </Link>
      <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-wider">
        {unpublished && file.status === "published" ? <span className="text-amber-700">Changes</span> : null}
        <span className={file.status === "published" ? "text-emerald-700" : file.status === "archived" ? "text-neutral-400" : "text-neutral-500"}>{file.status}</span>
        {file.featured ? <span className="text-neutral-400">★</span> : null}
      </div>
      <div className="relative">
        <button className="ui-btn ui-btn-ghost h-7 px-2" onClick={() => setMenu((m) => !m)}>···</button>
        {menu ? (
          <div className="absolute right-0 z-20 mt-1 w-52 rounded-sm border border-neutral-200 bg-white py-1 text-[12px] shadow-lg" onMouseLeave={() => setMenu(false)}>
            <Link href={editHref} className="block px-3 py-1.5 hover:bg-neutral-50">Edit</Link>
            <Link href={`/preview?type=project&id=${file.id}`} className="block px-3 py-1.5 hover:bg-neutral-50">Preview draft</Link>
            {file.status === "published" ? <a href={withBase(`/projects/${file.slug}/`)} target="_blank" rel="noreferrer" className="block px-3 py-1.5 hover:bg-neutral-50">View live ↗</a> : null}
            <div className="my-1 border-t border-neutral-100" />
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onFlags({ featured: !file.featured })}>{file.featured ? "Remove from featured" : "Mark as featured"}</button>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onFlags({ showOnHome: !file.showOnHome })}>{file.showOnHome ? "Hide from home" : "Show on home"}</button>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onFlags({ showInArchive: !file.showInArchive })}>{file.showInArchive ? "Hide from archive" : "Show in archive"}</button>
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={() => onFlags({ status: file.status === "archived" ? "draft" : "archived" })}>{file.status === "archived" ? "Unarchive (→ draft)" : "Hide (archive project)"}</button>
            <div className="my-1 border-t border-neutral-100" />
            <button className="block w-full px-3 py-1.5 text-left hover:bg-neutral-50" onClick={onDuplicate}>Duplicate</button>
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
      const p = await createProject({ ...form, categoryId: form.categoryId || null, photoIds: photos.map((x) => x.id) });
      router.push(`/admin/editor?type=project&id=${p.file.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={step === 1 ? "New project" : `New project — ${form.name}`} width="max-w-2xl"
        footer={step === 1 ? (
          <><button className="ui-btn" onClick={onClose}>Cancel</button><button className="ui-btn ui-btn-primary" disabled={!form.name.trim()} onClick={() => setStep(2)}>Next: select photos →</button></>
        ) : (
          <><button className="ui-btn" onClick={() => setStep(1)}>← Back</button><button className="ui-btn ui-btn-primary" disabled={busy} onClick={create}>{busy ? "Creating…" : photos.length ? `Create with ${photos.length} photos` : "Create empty project"}</button></>
        )}>
        {step === 1 ? (
          <div className="grid grid-cols-2 gap-x-4 p-5">
            <div className="col-span-2"><Field label="Project name"><input className="ui-input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enduro 2026" /></Field></div>
            <Field label="Year"><input className="ui-input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
            <Field label="Location"><input className="ui-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Guadalajara, Mexico" /></Field>
            <div className="col-span-2"><Field label="Category"><select className="ui-input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div>
            <div className="col-span-2"><Field label="Description"><textarea className="ui-input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
          </div>
        ) : (
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[12px] text-neutral-600">{photos.length ? `${photos.length} photographs selected — selection order is kept.` : "Choose the photographs for this project. A first editorial composition is generated from their orientation and tone."}</p>
              <button className="ui-btn" onClick={() => setPicker(true)}>{photos.length ? "Change selection" : "Select photos"}</button>
            </div>
            {photos.length ? (
              <div className="grid grid-cols-6 gap-2">
                {photos.map((p, i) => (
                  <div key={p.id} className="relative aspect-square overflow-hidden rounded-sm bg-neutral-100">
                    <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" />
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
