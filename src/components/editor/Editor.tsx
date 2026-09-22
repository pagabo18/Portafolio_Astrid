"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Block, BlocksDocument } from "@/lib/blocks/schema";
import type { PhotoView } from "@/lib/photos/view";
import { api } from "@/lib/client/api";
import { PhotoPicker } from "@/components/admin/PhotoPicker";
import { useEditor } from "./store";
import type { EditorProps, EditorTarget } from "./types";
import { TopBar } from "./TopBar";
import { BlockList } from "./BlockList";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { AddBlockMenu } from "./AddBlockMenu";
import { VersionsPanel } from "./VersionsPanel";
import { PageSettingsModal, ProjectSettingsModal } from "./SettingsModal";
import { ArchiveOrderModal } from "./ArchiveOrder";

const AUTOSAVE_MS = 1500;

type PickReq = { multiple: boolean; onPick: (p: PhotoView[]) => void };

export function Editor(props: EditorProps) {
  const router = useRouter();
  const [target, setTarget] = useState<EditorTarget>(props.target);
  const [archivePhotos, setArchivePhotos] = useState(props.archivePhotos ?? []);
  const [status, setStatus] = useState({ published: props.target.status === "published", hasUnpublished: props.target.hasUnpublished, publishedAt: props.target.publishedAt });
  const [addAfter, setAddAfter] = useState<string | null | false>(false);
  const [pick, setPick] = useState<PickReq | null>(null);
  const [versions, setVersions] = useState(false);
  const [settings, setSettings] = useState(false);
  const [archiveOrder, setArchiveOrder] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const init = useEditor((s) => s.init);
  const doc = useEditor((s) => s.doc);
  const dirty = useEditor((s) => s.dirty);
  const setSaveState = useEditor((s) => s.setSaveState);
  const markSaved = useEditor((s) => s.markSaved);
  const insertBlock = useEditor((s) => s.insertBlock);
  const mergePhotos = useEditor((s) => s.mergePhotos);
  const setDoc = useEditor((s) => s.setDoc);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const removeBlock = useEditor((s) => s.removeBlock);
  const removeSlot = useEditor((s) => s.removeSlot);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  const scope = target.type;
  const draftUrl = target.type === "project" ? `/api/admin/projects/${target.id}/draft` : `/api/admin/pages/${target.id}/draft`;
  const publishUrl = target.type === "project" ? `/api/admin/projects/${target.id}/publish` : `/api/admin/pages/${target.id}/publish`;

  // load initial state once
  useEffect(() => {
    init(props.document, props.photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.target.id]);

  /* ---------------- autosave ---------------- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const latest = useRef(doc);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    latest.current = doc;
  }, [doc]);

  const save = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const snapshot = latest.current;
    setSaveState("saving");
    const run = async () => {
      try {
        const r = await api<{ hasUnpublished: boolean }>(draftUrl, { method: "PUT", json: { document: snapshot } });
        if (latest.current === snapshot) markSaved();
        else setSaveState("unsaved");
        setStatus((s) => ({ ...s, hasUnpublished: r.hasUnpublished }));
      } catch {
        setSaveState("error");
        saveTimer.current = setTimeout(() => void saveRef.current(), 4000);
      }
    };
    inflight.current = run();
    await inflight.current;
    inflight.current = null;
  }, [draftUrl, markSaved, setSaveState]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [doc, dirty, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().saveState !== "saved") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  /* ---------------- publish ---------------- */
  async function publish() {
    setPublishing(true);
    try {
      if (useEditor.getState().saveState !== "saved") await save();
      if (inflight.current) await inflight.current;
      const r = await api<{ publishedAt: string | null; slug?: string }>(publishUrl, { method: "POST" });
      setStatus({ published: true, hasUnpublished: false, publishedAt: r.publishedAt });
      if (r.slug && target.type === "project") setTarget({ ...target, slug: r.slug, status: "published" });
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  /* ---------------- shortcuts ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Escape") {
        select(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        if (selection.slotId) {
          const b = useEditor.getState().doc.blocks.find((x) => x.id === selection.blockId);
          if (b?.type === "image-group") removeSlot(selection.blockId, selection.slotId);
          else removeBlock(selection.blockId);
        } else removeBlock(selection.blockId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, undo, redo, select, selection, removeBlock, removeSlot]);

  /* ---------------- helpers ---------------- */
  const requestPhotos = useCallback((req: PickReq) => setPick(req), []);

  function onInsert(block: Block, photos: PhotoView[]) {
    if (photos.length) mergePhotos(photos);
    insertBlock(block, addAfter === false ? null : addAfter);
    setAddAfter(false);
  }

  async function rename(name: string) {
    if (target.type !== "project") return;
    const r = await api<{ slug: string; name: string }>(`/api/admin/projects/${target.id}`, { method: "PATCH", json: { name } });
    setTarget({ ...target, name: r.name, slug: r.slug, meta: { ...target.meta, name: r.name, slug: r.slug } });
    setStatus((s) => ({ ...s, hasUnpublished: true }));
  }

  const projectHeader =
    target.type === "project"
      ? { name: target.meta.name, year: target.meta.year, location: target.meta.location, description: target.meta.description, categoryName: props.categories.find((c) => c.id === target.meta.categoryId)?.name ?? "", index: target.index }
      : undefined;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100">
      <TopBar
        target={target}
        status={status}
        onRename={rename}
        onSave={() => void save()}
        onPublish={publish}
        onOpenSettings={() => setSettings(true)}
        onOpenVersions={() => setVersions(true)}
        publishing={publishing}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 border-r border-neutral-200 bg-white">
          <BlockList onAdd={(after) => setAddAfter(after)} />
          {target.type === "page" && target.slug === "archive" ? (
            <div className="border-t border-neutral-200 p-3">
              <button className="ui-btn w-full" onClick={() => setArchiveOrder(true)}>Archive order & visibility</button>
            </div>
          ) : null}
        </aside>
        <div className="min-w-0 flex-1">
          <Canvas data={{ project: projectHeader, projects: props.projects, archivePhotos: archivePhotos.filter((p) => p.showInArchive), categories: props.categories, years: props.years, projectHrefBase: "/preview/project" }} />
        </div>
        <aside className="w-[340px] shrink-0 overflow-hidden border-l border-neutral-200 bg-white">
          <Inspector onPickPhotos={requestPhotos} scope={scope} />
        </aside>
      </div>

      <AddBlockMenu open={addAfter !== false} onClose={() => setAddAfter(false)} scope={scope} onInsert={onInsert} onPickPhotos={requestPhotos} />
      <PhotoPicker
        open={!!pick}
        onClose={() => setPick(null)}
        multiple={pick?.multiple ?? true}
        projectId={target.type === "project" ? target.id : null}
        onPick={(p) => pick?.onPick(p)}
        title={pick?.multiple ? "Select photos" : "Select photo"}
      />
      <VersionsPanel open={versions} onClose={() => setVersions(false)} targetType={target.type} targetId={target.id} onRestore={(d: BlocksDocument) => setDoc(d)} />
      {target.type === "project" ? (
        <ProjectSettingsModal
          key={settings ? "open" : "closed"}
          open={settings}
          onClose={() => setSettings(false)}
          target={target}
          categories={props.categories}
          onPickPhotos={requestPhotos}
          onSaved={(t) => {
            setTarget({ ...target, ...t } as EditorTarget);
            setStatus((s) => ({ ...s, hasUnpublished: true }));
            router.refresh();
          }}
        />
      ) : (
        <PageSettingsModal key={settings ? "open" : "closed"} open={settings} onClose={() => setSettings(false)} target={target} onPickPhotos={requestPhotos} onSaved={(t) => { setTarget({ ...target, ...t } as EditorTarget); setStatus((s) => ({ ...s, hasUnpublished: true })); }} />
      )}
      {target.type === "page" && target.slug === "archive" ? (
        <ArchiveOrderModal open={archiveOrder} onClose={() => setArchiveOrder(false)} photos={archivePhotos} onChange={setArchivePhotos} />
      ) : null}
    </div>
  );
}
