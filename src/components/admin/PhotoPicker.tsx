"use client";

import { useEffect, useMemo, useState } from "react";
import type { PhotoView } from "@/lib/photos/view";
import { api } from "@/lib/client/api";
import { Modal } from "./ui/Modal";
import { UploadDropzone, UploadProgress, useUploader } from "./UploadDropzone";

export type PickerCategory = { id: string; name: string };

/**
 * Visual photo selector. Multi-select, search, filters, inline upload.
 * Resolves with the selected photos (ordered by click order).
 */
type PickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (photos: PhotoView[]) => void;
  multiple?: boolean;
  title?: string;
  projectId?: string | null;
  initialSelected?: string[];
};

export function PhotoPicker(props: PickerProps) {
  if (!props.open) return null;
  return <PickerBody {...props} />;
}

function PickerBody({ open, onClose, onPick, multiple = true, title = "Select photo", projectId, initialSelected = [] }: PickerProps) {
  const [photos, setPhotos] = useState<PhotoView[]>([]);
  const [cats, setCats] = useState<PickerCategory[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [orientation, setOrientation] = useState("");
  const [scope, setScope] = useState<"all" | "project">(projectId ? "project" : "all");
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([api<PhotoView[]>("/api/admin/photos?hidden=all"), api<PickerCategory[]>("/api/admin/categories")])
      .then(([p, c]) => {
        if (!alive) return;
        setPhotos(p);
        setCats(c);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const uploader = useUploader((added) => {
    setPhotos((p) => [...added, ...p]);
    setSelected((s) => (multiple ? [...s, ...added.map((a) => a.id)] : [added[0].id]));
  }, { projectId });

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return photos.filter((p) => {
      if (scope === "project" && projectId && p.projectId !== projectId) return false;
      if (cat && p.categoryId !== cat) return false;
      if (orientation && p.orientation !== orientation) return false;
      if (needle && ![p.filename, p.title, p.location, p.year, p.description].some((s) => s.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [photos, q, cat, orientation, scope, projectId]);

  function toggle(id: string) {
    if (!multiple) return setSelected([id]);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function confirm() {
    const picked = selected.map((id) => photos.find((p) => p.id === id)).filter((p): p is PhotoView => !!p);
    onPick(picked);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-5xl"
      footer={
        <>
          <span className="mr-auto text-[11px] text-neutral-500">{selected.length ? `${selected.length} selected` : multiple ? "Click to select several" : "Click a photo"}</span>
          <button className="ui-btn" onClick={onClose}>Cancel</button>
          <button className="ui-btn ui-btn-primary" disabled={!selected.length} onClick={confirm}>
            {multiple ? `Use ${selected.length || ""} photo${selected.length === 1 ? "" : "s"}` : "Use photo"}
          </button>
        </>
      }
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-neutral-100 bg-white px-5 py-3">
        <input className="ui-input max-w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {projectId ? (
          <div className="ui-seg">
            <button data-active={scope === "project"} onClick={() => setScope("project")}>This project</button>
            <button data-active={scope === "all"} onClick={() => setScope("all")}>All photos</button>
          </div>
        ) : null}
        <div className="ui-seg">
          <button data-active={cat === ""} onClick={() => setCat("")}>All</button>
          {cats.map((c) => (
            <button key={c.id} data-active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>
          ))}
        </div>
        <div className="ui-seg">
          {[["", "Any"], ["landscape", "Landscape"], ["portrait", "Portrait"], ["square", "Square"]].map(([v, l]) => (
            <button key={v} data-active={orientation === v} onClick={() => setOrientation(v)}>{l}</button>
          ))}
        </div>
        <div className="ml-auto w-48">
          <UploadDropzone compact onFiles={uploader.upload} />
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="py-20 text-center text-[12px] text-neutral-400">Loading…</div>
        ) : !list.length ? (
          <div className="py-20 text-center text-[12px] text-neutral-400">No photos match. Upload some above.</div>
        ) : (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
            {list.map((p) => {
              const idx = selected.indexOf(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  onDoubleClick={() => { if (!multiple) { onPick([p]); onClose(); } }}
                  className={`group relative aspect-square overflow-hidden rounded-sm bg-neutral-100 outline-offset-2 transition ${idx >= 0 ? "outline outline-2 outline-neutral-900" : "hover:opacity-90"}`}
                  title={p.filename}
                > <img src={p.thumbUrl} alt={p.alt} className="h-full w-full object-cover" loading="lazy" style={{ backgroundColor: p.dominantColor }} />
                  {p.hidden ? <span className="absolute left-1 top-1 rounded-sm bg-black/70 px-1 text-[9px] uppercase tracking-wider text-white">Hidden</span> : null}
                  {idx >= 0 ? <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-neutral-900 px-1 text-[10px] text-white">{multiple ? idx + 1 : "✓"}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <UploadProgress progress={uploader.progress} />
    </Modal>
  );
}
