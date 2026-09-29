"use client";

import { useMemo, useState } from "react";
import type { PhotoView } from "@/lib/photos/view";
import { useAdminState, views } from "@/lib/content/admin";
import { Modal } from "./ui/Modal";
import { UploadDropzone, UploadProgress, useUploader } from "./UploadDropzone";
import { useT } from "@/lib/i18n/useT";

type PickerProps = {
  open: boolean;
  onClose: () => void;
  onPick: (photos: PhotoView[]) => void;
  multiple?: boolean;
  title?: string;
  projectId?: string | null;
  initialSelected?: string[];
};

/** Visual photo selector: multi-select, search, filters, inline upload. */
export function PhotoPicker(props: PickerProps) {
  if (!props.open) return null;
  return <PickerBody {...props} />;
}

function PickerBody({ onClose, onPick, multiple = true, title, projectId, initialSelected = [] }: PickerProps) {
  const t = useT();
  const records = useAdminState((s) => s.photos);
  const cats = useAdminState((s) => s.categories);
  const photos = useMemo(() => views(records), [records]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [orientation, setOrientation] = useState("");
  const [scope, setScope] = useState<"all" | "project">(projectId ? "project" : "all");
  const [selected, setSelected] = useState<string[]>(initialSelected);

  const uploader = useUploader((added) => setSelected((s) => (multiple ? [...s, ...added.map((a) => a.id)] : [added[0].id])), { projectId });

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
    onPick(selected.map((id) => photos.find((p) => p.id === id)).filter((p): p is PhotoView => !!p));
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title ?? t("Select photo")}
      width="max-w-5xl"
      footer={
        <>
          <span className="mr-auto text-[11px] text-neutral-500">{selected.length ? `${selected.length} ${t("selected")}` : t(multiple ? "Click to select several" : "Click a photo")}</span>
          <button className="ui-btn" onClick={onClose}>{t("Cancel")}</button>
          <button className="ui-btn ui-btn-primary" disabled={!selected.length} onClick={confirm}>{multiple ? `${t("Done")} · ${selected.length}` : t("Done")}</button>
        </>
      }
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-neutral-100 bg-white px-5 py-3">
        <input className="ui-input max-w-56" placeholder={t("Search…")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {projectId ? (
          <div className="ui-seg">
            <button data-active={scope === "project"} onClick={() => setScope("project")}>{t("This project")}</button>
            <button data-active={scope === "all"} onClick={() => setScope("all")}>{t("All photos")}</button>
          </div>
        ) : null}
        <div className="ui-seg">
          <button data-active={cat === ""} onClick={() => setCat("")}>{t("All")}</button>
          {cats.map((c) => <button key={c.id} data-active={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>)}
        </div>
        <div className="ui-seg">
          {[["", t("Any")], ["landscape", t("Landscape")], ["portrait", t("Portrait")], ["square", t("Square")]].map(([v, l]) => (
            <button key={v} data-active={orientation === v} onClick={() => setOrientation(v)}>{l}</button>
          ))}
        </div>
        <div className="ml-auto w-48"><UploadDropzone compact onFiles={uploader.upload} /></div>
      </div>
      <div className="p-5">
        {!list.length ? (
          <div className="py-20 text-center text-[12px] text-neutral-400">{t("No photos match. Upload some above.")}</div>
        ) : (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
            {list.map((p) => {
              const idx = selected.indexOf(p.id);
              return (
                <button key={p.id} onClick={() => toggle(p.id)} onDoubleClick={() => { if (!multiple) { onPick([p]); onClose(); } }} className={`group relative aspect-square overflow-hidden rounded-sm bg-neutral-100 outline-offset-2 transition ${idx >= 0 ? "outline outline-2 outline-neutral-900" : "hover:opacity-90"}`} title={p.filename}>
                  <img src={p.thumbUrl} alt={p.alt} className="h-full w-full object-cover" loading="lazy" style={{ backgroundColor: p.dominantColor }} />
                  {p.hidden ? <span className="absolute left-1 top-1 rounded-sm bg-black/70 px-1 text-[9px] uppercase tracking-wider text-white">{t("Hide")}</span> : null}
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
