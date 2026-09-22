"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PhotoView } from "@/lib/photos/view";
import { api, formatBytes, formatRatio } from "@/lib/client/api";
import { UploadDropzone, UploadProgress, useUploader } from "./UploadDropzone";
import { ConfirmDialog, Modal } from "./ui/Modal";
import { Field, Toggle } from "./ui/Fields";
import { FocalPointEditor } from "./FocalPointEditor";

type Cat = { id: string; name: string };
type Proj = { id: string; name: string };

export function PhotoLibrary({ initial, categories: initialCats, projects, years, openUpload }: { initial: PhotoView[]; categories: Cat[]; projects: Proj[]; years: string[]; openUpload: boolean }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [cats, setCats] = useState(initialCats);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [proj, setProj] = useState("");
  const [orientation, setOrientation] = useState("");
  const [year, setYear] = useState("");
  const [vis, setVis] = useState<"all" | "visible" | "hidden">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [size, setSize] = useState<"s" | "m" | "l">("m");
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);
  const [showUpload, setShowUpload] = useState(openUpload);
  const [groupModal, setGroupModal] = useState(false);
  const lastClick = useRef<string | null>(null);

  const uploader = useUploader((added) => {
    setPhotos((p) => [...added, ...p]);
    router.refresh();
  });

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = photos.filter((p) => {
      if (cat && p.categoryId !== cat) return false;
      if (proj && p.projectId !== proj) return false;
      if (orientation && p.orientation !== orientation) return false;
      if (year && p.year !== year) return false;
      if (vis === "visible" && p.hidden) return false;
      if (vis === "hidden" && !p.hidden) return false;
      if (needle && ![p.filename, p.title, p.location, p.year, p.description, p.camera].some((s) => s.toLowerCase().includes(needle))) return false;
      return true;
    });
    out.sort((a, b) => {
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "name") return a.filename.localeCompare(b.filename);
      return b.bytes - a.bytes;
    });
    return out;
  }, [photos, q, cat, proj, orientation, year, vis, sort]);

  function clickPhoto(e: React.MouseEvent, id: string) {
    if (e.shiftKey && lastClick.current) {
      const a = list.findIndex((p) => p.id === lastClick.current);
      const b = list.findIndex((p) => p.id === id);
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const range = list.slice(lo, hi + 1).map((p) => p.id);
      setSelected((s) => [...new Set([...s, ...range])]);
    } else if (e.metaKey || e.ctrlKey) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setOpen(id);
    }
    lastClick.current = id;
  }

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    lastClick.current = id;
  }

  async function bulk(action: string, value?: string | null) {
    const ids = selected;
    if (!ids.length) return;
    if (action === "delete") return setConfirm({ ids });
    const res = await api<PhotoView[] | { ok: true }>("/api/admin/photos/bulk", { method: "POST", json: { ids, action, value } });
    if (Array.isArray(res)) setPhotos((ps) => ps.map((p) => res.find((r) => r.id === p.id) ?? p));
    else if (action === "add-to-project") {
      /* membership only */
    }
    router.refresh();
  }

  async function doDelete(ids: string[]) {
    await api("/api/admin/photos/bulk", { method: "POST", json: { ids, action: "delete" } });
    setPhotos((ps) => ps.filter((p) => !ids.includes(p.id)));
    setSelected((s) => s.filter((x) => !ids.includes(x)));
    if (open && ids.includes(open)) setOpen(null);
    router.refresh();
  }

  function updateLocal(p: PhotoView) {
    setPhotos((ps) => ps.map((x) => (x.id === p.id ? p : x)));
  }

  async function addCategory() {
    const name = window.prompt("New category name");
    if (!name?.trim()) return;
    const c = await api<Cat>("/api/admin/categories", { method: "POST", json: { name } });
    setCats((cs) => (cs.some((x) => x.id === c.id) ? cs : [...cs, c]));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") setSelected([]);
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        setSelected(list.map((p) => p.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list]);

  const cols = size === "s" ? "grid-cols-8" : size === "m" ? "grid-cols-6" : "grid-cols-4";
  const openPhoto = open ? photos.find((p) => p.id === open) ?? null : null;

  return (
    <div className="flex min-h-screen">
      <div className="min-w-0 flex-1 px-8 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="eyebrow">Photos · media library</div>
            <h1 className="mt-1 text-2xl font-light">{photos.length} photograph{photos.length === 1 ? "" : "s"}</h1>
          </div>
          <div className="flex gap-2">
            <button className="ui-btn" onClick={addCategory}>+ Category</button>
            <button className="ui-btn ui-btn-primary" onClick={() => setShowUpload((s) => !s)}>Upload</button>
          </div>
        </div>

        {showUpload ? (
          <div className="mb-6">
            <UploadDropzone onFiles={uploader.upload} />
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input className="ui-input max-w-52" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="ui-input max-w-40" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="ui-input max-w-44" value={proj} onChange={(e) => setProj(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {years.length ? (
            <select className="ui-input max-w-28" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Any year</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          ) : null}
          <div className="ui-seg">
            {[["", "Any"], ["landscape", "▭"], ["portrait", "▯"], ["square", "□"]].map(([v, l]) => (
              <button key={v} data-active={orientation === v} onClick={() => setOrientation(v)} title={v || "Any orientation"}>{l}</button>
            ))}
          </div>
          <div className="ui-seg">
            {(["all", "visible", "hidden"] as const).map((v) => (
              <button key={v} data-active={vis === v} onClick={() => setVis(v)}>{v}</button>
            ))}
          </div>
          <select className="ui-input max-w-32" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>
          <div className="ui-seg ml-auto">
            {(["s", "m", "l"] as const).map((v) => (
              <button key={v} data-active={size === v} onClick={() => setSize(v)}>{v.toUpperCase()}</button>
            ))}
          </div>
        </div>

        {selected.length ? (
          <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-neutral-900 bg-neutral-900 px-3 py-2 text-[12px] text-white">
            <span className="mr-2">{selected.length} selected</span>
            <select className="h-7 rounded-sm bg-white/10 px-2 text-white" defaultValue="" onChange={(e) => { if (e.target.value) bulk("add-to-project", e.target.value); e.target.value = ""; }}>
              <option value="" className="text-black">Add to project…</option>
              {projects.map((p) => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
            </select>
            <select className="h-7 rounded-sm bg-white/10 px-2 text-white" defaultValue="" onChange={(e) => { bulk("category", e.target.value || null); e.target.value = ""; }}>
              <option value="" className="text-black">Set category…</option>
              {cats.map((c) => <option key={c.id} value={c.id} className="text-black">{c.name}</option>)}
              <option value="" className="text-black">— none —</option>
            </select>
            <button className="rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => setGroupModal(true)}>Create group…</button>
            <button className="rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => bulk("hide")}>Hide</button>
            <button className="rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => bulk("show")}>Show</button>
            <button className="rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => bulk("home")}>Show on home</button>
            <button className="rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => bulk("archive")}>In archive</button>
            <button className="rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => bulk("unarchive")}>Not in archive</button>
            <button className="rounded-sm px-2 py-1 text-red-300 hover:bg-white/10" onClick={() => bulk("delete")}>Delete…</button>
            <button className="ml-auto rounded-sm px-2 py-1 hover:bg-white/10" onClick={() => setSelected([])}>Clear</button>
          </div>
        ) : null}

        {!list.length ? (
          <div className="ui-card px-6 py-20 text-center text-[12.5px] text-neutral-500">
            {photos.length ? "No photographs match these filters." : "The library is empty. Upload photographs to get started."}
          </div>
        ) : (
          <div className={`grid ${cols} gap-3`}>
            {list.map((p) => {
              const sel = selected.includes(p.id);
              return (
                <div key={p.id} className={`group relative overflow-hidden rounded-sm bg-neutral-100 ${sel ? "outline outline-2 outline-neutral-900 outline-offset-2" : ""}`}>
                  <button className="block aspect-square w-full" onClick={(e) => clickPhoto(e, p.id)} title={`${p.filename} — ${p.width}×${p.height}`}> <img src={p.thumbUrl} alt={p.alt} className={`h-full w-full object-cover transition ${p.hidden ? "opacity-40" : ""}`} loading="lazy" style={{ backgroundColor: p.dominantColor }} />
                  </button>
                  <button
                    onClick={() => toggleSelect(p.id)}
                    className={`absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-sm border text-[10px] transition ${sel ? "border-neutral-900 bg-neutral-900 text-white" : "border-white/80 bg-black/30 text-transparent opacity-0 group-hover:opacity-100"}`}
                    aria-label="Select"
                  >
                    ✓
                  </button>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-[9.5px] text-white opacity-0 transition group-hover:opacity-100">
                    <span className="truncate">{p.title || p.filename}</span>
                    <span className="shrink-0">{formatRatio(p.aspectRatio)}</span>
                  </div>
                  {p.hidden ? <span className="absolute right-1.5 top-1.5 rounded-sm bg-black/70 px-1 text-[9px] uppercase tracking-wider text-white">Hidden</span> : null}
                  {p.featured ? <span className="absolute right-1.5 bottom-1.5 text-[10px] text-white drop-shadow">★</span> : null}
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-[11px] text-neutral-400">Click to open · ⌘/Ctrl+click to select · Shift+click for a range · ⌘/Ctrl+A select all</p>
      </div>

      {openPhoto ? (
        <PhotoDetails
          key={openPhoto.id}
          photo={openPhoto}
          categories={cats}
          projects={projects}
          onClose={() => setOpen(null)}
          onChange={updateLocal}
          onDelete={() => setConfirm({ ids: [openPhoto.id] })}
        />
      ) : null}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`Delete ${confirm?.ids.length === 1 ? "photograph" : `${confirm?.ids.length} photographs`}?`}
        message="The original and every generated variant are removed from storage. Layouts that use them will show an empty slot. Use “Hide” if you only want them off the site."
        onConfirm={async () => { if (confirm) await doDelete(confirm.ids); }}
      />
      <CreateGroupModal open={groupModal} onClose={() => setGroupModal(false)} projects={projects} photoIds={selected} />
      <UploadProgress progress={uploader.progress} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PhotoDetails({ photo, categories, projects, onClose, onChange, onDelete }: { photo: PhotoView; categories: Cat[]; projects: Proj[]; onClose: () => void; onChange: (p: PhotoView) => void; onDelete: () => void }) {
  const [p, setP] = useState(photo);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);

  function patch(partial: Partial<PhotoView>) {
    const next = { ...p, ...partial };
    setP(next);
    onChange(next);
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const saved = await api<PhotoView>(`/api/admin/photos/${p.id}`, { method: "PATCH", json: partial });
      setP((cur) => ({ ...cur, categoryName: saved.categoryName, altSuggested: saved.altSuggested }));
      onChange({ ...next, categoryName: saved.categoryName, altSuggested: saved.altSuggested });
      setState("saved");
      setTimeout(() => setState("idle"), 1500);
    }, 500);
  }

  async function replace(file: File) {
    setReplacing(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/admin/photos/${p.id}/replace`, { method: "POST", body: fd });
      const saved = (await res.json()) as PhotoView;
      if (res.ok) {
        setP(saved);
        onChange(saved);
      }
    } finally {
      setReplacing(false);
    }
  }

  const input = (k: keyof PhotoView, placeholder?: string) => (
    <input className="ui-input" value={String(p[k] ?? "")} placeholder={placeholder} onChange={(e) => patch({ [k]: e.target.value } as Partial<PhotoView>)} />
  );

  return (
    <aside className="sticky top-0 h-screen w-[380px] shrink-0 overflow-y-auto border-l border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <span className="truncate text-[12px] text-neutral-700">{p.filename}</span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className={state === "saving" ? "text-neutral-400" : state === "saved" ? "text-emerald-700" : "text-transparent"}>{state === "saving" ? "Saving…" : "Saved"}</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900">✕</button>
        </div>
      </div>
      <div className="space-y-5 p-4">
        <FocalPointEditor photo={p} x={p.focalX} y={p.focalY} onChange={(x, y) => patch({ focalX: x, focalY: y })} aspectPreview="16:9" />

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-neutral-600">
          <dt className="text-neutral-400">Dimensions</dt><dd>{p.width} × {p.height}</dd>
          <dt className="text-neutral-400">Aspect ratio</dt><dd>{formatRatio(p.aspectRatio)} · {p.orientation}</dd>
          <dt className="text-neutral-400">Original</dt><dd>{formatBytes(p.bytes)} · {p.mime.replace("image/", "")}</dd>
          <dt className="text-neutral-400">Web variants</dt><dd>{p.sources.avif.length} AVIF · {p.sources.webp.length} WebP</dd>
          <dt className="text-neutral-400">Uploaded</dt><dd>{new Date(p.createdAt).toLocaleDateString()}</dd>
        </dl>

        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && replace(e.target.files[0])} />
          <button className="ui-btn" onClick={() => fileRef.current?.click()} disabled={replacing}>{replacing ? "Replacing…" : "Replace file"}</button>
          <a className="ui-btn" href={p.originalUrl} target="_blank" rel="noreferrer">Original ↗</a>
          <button className="ui-btn ui-btn-danger ml-auto" onClick={onDelete}>Delete…</button>
        </div>

        <div>
          <div className="eyebrow mb-2">Visibility</div>
          <Toggle label="Hidden (off the site, kept in library)" checked={p.hidden} onChange={(v) => patch({ hidden: v })} />
          <Toggle label="Featured" checked={p.featured} onChange={(v) => patch({ featured: v })} />
          <Toggle label="Show on home" checked={p.showOnHome} onChange={(v) => patch({ showOnHome: v })} />
          <Toggle label="Show in archive" checked={p.showInArchive} onChange={(v) => patch({ showInArchive: v })} />
        </div>

        <div>
          <div className="eyebrow mb-2">Metadata</div>
          <Field label="Title">{input("title")}</Field>
          <Field label="Caption / description"><textarea className="ui-input min-h-16" value={p.description} onChange={(e) => patch({ description: e.target.value })} /></Field>
          <Field label={<>Alt text {p.altSuggested ? <span className="ml-1 rounded-sm bg-amber-100 px-1 text-[9px] normal-case tracking-normal text-amber-800">suggested — review</span> : null}</>} hint="Describe the image for accessibility. A suggestion is generated from the file name; edit it to confirm.">
            {input("alt")}
          </Field>
          <div className="grid grid-cols-2 gap-x-3">
            <Field label="Year">{input("year")}</Field>
            <Field label="Location">{input("location")}</Field>
            <Field label="Camera">{input("camera")}</Field>
            <Field label="Lens">{input("lens")}</Field>
          </div>
          <Field label="Category">
            <select className="ui-input" value={p.categoryId ?? ""} onChange={(e) => patch({ categoryId: e.target.value || null })}>
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Primary project">
            <select className="ui-input" value={p.projectId ?? ""} onChange={(e) => patch({ projectId: e.target.value || null })}>
              <option value="">—</option>
              {projects.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </aside>
  );
}

/** Multi-select → CREATE GROUP → choose layout → appended to a project. */
function CreateGroupModal({ open, onClose, projects, photoIds }: { open: boolean; onClose: () => void; projects: Proj[]; photoIds: string[] }) {
  const router = useRouter();
  const [project, setProject] = useState(projects[0]?.id ?? "");
  const [layout, setLayout] = useState("two-columns");
  const [busy, setBusy] = useState(false);
  const layouts = [
    ["two-columns", "Pair"],
    ["triptych", "Triptych"],
    ["grid", "Grid"],
    ["sequence", "Sequence"],
    ["spread", "Editorial spread"],
    ["editorial-offset", "Editorial offset"],
    ["custom", "Custom group"],
  ];
  async function create() {
    if (!project) return;
    setBusy(true);
    try {
      const { createBlock } = await import("@/lib/blocks/templates");
      const p = await api<{ draft: { version: 1; blocks: unknown[] } }>(`/api/admin/projects/${project}`);
      const block = createBlock("image-group", { photoIds, layout });
      await api(`/api/admin/projects/${project}/draft`, { method: "PUT", json: { document: { version: 1, blocks: [...p.draft.blocks, block] } } });
      router.push(`/admin/projects/${project}`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Create group from ${photoIds.length} photos`} width="max-w-md" footer={<><button className="ui-btn" onClick={onClose}>Cancel</button><button className="ui-btn ui-btn-primary" disabled={!project || busy} onClick={create}>Add to project</button></>}>
      <div className="p-5">
        <Field label="Project">
          <select className="ui-input" value={project} onChange={(e) => setProject(e.target.value)}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Layout">
          <div className="grid grid-cols-2 gap-1.5">
            {layouts.map(([v, l]) => (
              <button key={v} className={`ui-btn justify-start ${layout === v ? "ui-btn-primary" : ""}`} onClick={() => setLayout(v)}>{l}</button>
            ))}
          </div>
        </Field>
        <p className="text-[11px] text-neutral-500">The group is appended as a block to the project draft. Rearrange it in the editor.</p>
      </div>
    </Modal>
  );
}
