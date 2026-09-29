"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PhotoView } from "@/lib/photos/view";
import { deleteProject, setProjectPhotos, updatePageMeta, updateProjectFlags, updateProjectMeta } from "@/lib/content/admin";
import type { PageSlug } from "@/lib/content/types";
import { withBase } from "@/lib/content/paths";
import { Modal, ConfirmDialog } from "@/components/admin/ui/Modal";
import { Field, Toggle } from "@/components/admin/ui/Fields";
import { useEditor } from "./store";
import { useT } from "@/lib/i18n/useT";
import type { EditorTarget } from "./types";

type ProjectMeta = Extract<EditorTarget, { type: "project" }>["meta"];
type PageMeta = Extract<EditorTarget, { type: "page" }>["meta"];

export function ProjectSettingsModal({
  open,
  onClose,
  target,
  categories,
  onSaved,
  onPickPhotos,
}: {
  open: boolean;
  onClose: () => void;
  target: Extract<EditorTarget, { type: "project" }>;
  categories: { id: string; name: string }[];
  onSaved: (t: Partial<Extract<EditorTarget, { type: "project" }>>) => void;
  onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void;
}) {
  const t = useT();
  const router = useRouter();
  const photos = useEditor((s) => s.photos);
  const mergePhotos = useEditor((s) => s.mergePhotos);
  const [m, setM] = useState<ProjectMeta>(target.meta);
  const [photoIds, setPhotoIds] = useState(target.photoIds);
  const [tab, setTab] = useState<"general" | "photos" | "seo">("general");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const cover = m.coverPhotoId ? photos[m.coverPhotoId] : undefined;
  const og = m.ogPhotoId ? photos[m.ogPhotoId] : undefined;

  async function save() {
    setBusy(true);
    try {
      const { featured, showOnHome, showInArchive, ...meta } = m;
      const d = await updateProjectMeta(target.id, meta);
      if (featured !== target.meta.featured || showOnHome !== target.meta.showOnHome || showInArchive !== target.meta.showInArchive) {
        await updateProjectFlags(target.id, { featured, showOnHome, showInArchive });
      }
      if (photoIds.join() !== target.photoIds.join()) await setProjectPhotos(target.id, photoIds);
      onSaved({ meta: { ...d.meta, featured, showOnHome, showInArchive }, name: d.meta.name, slug: d.meta.slug, photoIds, hasUnpublished: true });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await deleteProject(target.id);
    router.push("/admin/projects");
  }

  const previewUrl = typeof window !== "undefined" ? `${window.location.origin}${withBase(`/preview/?type=project&id=${target.id}`)}` : "";

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={t("Project settings")}
        width="max-w-2xl"
        footer={
          <>
            <button className="ui-btn ui-btn-danger mr-auto" onClick={() => setDel(true)}>{t("Delete project…")}</button>
            <button className="ui-btn" onClick={onClose}>{t("Cancel")}</button>
            <button className="ui-btn ui-btn-primary" onClick={save} disabled={busy}>{busy ? t("Saving…") : t("Save")}</button>
          </>
        }
      >
        <div className="flex gap-4 border-b border-neutral-100 px-5 pt-3 text-[12px]">
          {(["general", "photos", "seo"] as const).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`border-b-2 pb-2 ${tab === tb ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500"}`}>
              {tb === "general" ? t("General") : tb === "photos" ? `${t("Photos")} · ${photoIds.length}` : "SEO"}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === "general" ? (
            <div className="grid grid-cols-2 gap-x-4">
              <div className="col-span-2"><Field label={t("Project name")}><input className="ui-input" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field></div>
              <Field label={t("Slug (URL)")}><input className="ui-input" value={m.slug} onChange={(e) => setM({ ...m, slug: e.target.value })} /></Field>
              <Field label={t("Category")}>
                <select className="ui-input" value={m.categoryId ?? ""} onChange={(e) => setM({ ...m, categoryId: e.target.value || null })}>
                  <option value="">—</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={t("Year")}><input className="ui-input" value={m.year} onChange={(e) => setM({ ...m, year: e.target.value })} /></Field>
              <Field label={t("Location")}><input className="ui-input" value={m.location} onChange={(e) => setM({ ...m, location: e.target.value })} /></Field>
              <div className="col-span-2"><Field label={t("Description")}><textarea className="ui-input min-h-24" value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} /></Field></div>
              <div className="col-span-2">
                <Field label={t("Cover image")}>
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-24 overflow-hidden rounded-sm bg-neutral-100">{cover ? <img src={cover.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
                    <button className="ui-btn" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); setM((x) => ({ ...x, coverPhotoId: p[0].id })); } })}>{t("Choose cover")}</button>
                  </div>
                </Field>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-x-6">
                <Toggle label={t("Featured")} checked={m.featured} onChange={(v) => setM({ ...m, featured: v })} />
                <Toggle label={t("Show on home")} checked={m.showOnHome} onChange={(v) => setM({ ...m, showOnHome: v })} />
                <Toggle label={t("Show in archive")} checked={m.showInArchive} onChange={(v) => setM({ ...m, showInArchive: v })} />
              </div>
              <div className="col-span-2 mt-3">
                <Field label={t("Draft preview")}>
                  <input className="ui-input" readOnly value={previewUrl} onFocus={(e) => e.target.select()} />
                </Field>
              </div>
            </div>
          ) : tab === "photos" ? (
            <div>
              <p className="mb-3 text-[11.5px] text-neutral-500">{t("Photographs that belong to this project. Photos placed in the layout are added automatically.")}</p>
              <div className="grid grid-cols-6 gap-2">
                {photoIds.map((id) => {
                  const p = photos[id];
                  return (
                    <div key={id} className="group relative aspect-square overflow-hidden rounded-sm bg-neutral-100">
                      {p ? <img src={p.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}
                      <button className="absolute right-1 top-1 hidden h-5 w-5 rounded-sm bg-black/60 text-[10px] text-white group-hover:block" onClick={() => setPhotoIds((ids) => ids.filter((x) => x !== id))}>✕</button>
                      {m.coverPhotoId === id ? <span className="absolute bottom-1 left-1 rounded-sm bg-black/60 px-1 text-[9px] text-white">cover</span> : null}
                    </div>
                  );
                })}
                <button className="aspect-square rounded-sm border border-dashed border-neutral-300 text-[11px] text-neutral-500 hover:border-neutral-900" onClick={() => onPickPhotos({ multiple: true, onPick: (p) => { mergePhotos(p); setPhotoIds((ids) => [...ids, ...p.map((x) => x.id).filter((x) => !ids.includes(x))]); } })}>{t("+ Add")}</button>
              </div>
            </div>
          ) : (
            <div>
              <Field label={t("SEO title")}><input className="ui-input" value={m.seoTitle} onChange={(e) => setM({ ...m, seoTitle: e.target.value })} /></Field>
              <Field label={t("SEO description")}><textarea className="ui-input min-h-20" value={m.seoDescription} onChange={(e) => setM({ ...m, seoDescription: e.target.value })} /></Field>
              <Field label={t("Open Graph image")}>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-28 overflow-hidden rounded-sm bg-neutral-100">{og ? <img src={og.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
                  <button className="ui-btn" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); setM((x) => ({ ...x, ogPhotoId: p[0].id })); } })}>{t("Choose")}</button>
                  {m.ogPhotoId ? <button className="ui-btn" onClick={() => setM({ ...m, ogPhotoId: null })}>{t("Use cover")}</button> : null}
                </div>
              </Field>
            </div>
          )}
        </div>
      </Modal>
      <ConfirmDialog open={del} onClose={() => setDel(false)} title={`${t("Delete")} “${target.name}”?`} message={t("The project page and its layout are removed. Photographs stay in the library.")} onConfirm={remove} />
    </>
  );
}

export function PageSettingsModal({ open, onClose, target, onSaved, onPickPhotos }: { open: boolean; onClose: () => void; target: Extract<EditorTarget, { type: "page" }>; onSaved: (v: Partial<Extract<EditorTarget, { type: "page" }>>) => void; onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void }) {
  const t = useT();
  const photos = useEditor((s) => s.photos);
  const mergePhotos = useEditor((s) => s.mergePhotos);
  const [m, setM] = useState<PageMeta>(target.meta);
  const [busy, setBusy] = useState(false);
  const og = m.ogPhotoId ? photos[m.ogPhotoId] : undefined;
  async function save() {
    setBusy(true);
    try {
      await updatePageMeta(target.id as PageSlug, m);
      onSaved({ meta: m, name: m.title, hasUnpublished: true });
      onClose();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={t("Page settings")} width="max-w-lg" footer={<><button className="ui-btn" onClick={onClose}>{t("Cancel")}</button><button className="ui-btn ui-btn-primary" onClick={save} disabled={busy}>Save</button></>}>
      <div className="p-5">
        <Field label={t("Title")}><input className="ui-input" value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></Field>
        <Field label={t("SEO title")}><input className="ui-input" value={m.seoTitle} onChange={(e) => setM({ ...m, seoTitle: e.target.value })} /></Field>
        <Field label={t("SEO description")}><textarea className="ui-input min-h-20" value={m.seoDescription} onChange={(e) => setM({ ...m, seoDescription: e.target.value })} /></Field>
        <Field label={t("Open Graph image")}>
          <div className="flex items-center gap-3">
            <div className="h-16 w-28 overflow-hidden rounded-sm bg-neutral-100">{og ? <img src={og.thumbUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
            <button className="ui-btn" onClick={() => onPickPhotos({ multiple: false, onPick: (p) => { mergePhotos(p); setM((x) => ({ ...x, ogPhotoId: p[0].id })); } })}>{t("Choose")}</button>
          </div>
        </Field>
        <p className="text-[11px] text-neutral-500">{t("Publish from the top bar to make changes live.")}</p>
      </div>
    </Modal>
  );
}
