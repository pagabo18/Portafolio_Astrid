"use client";

import Link from "next/link";
import { useState } from "react";
import { useEditor } from "./store";
import { withBase } from "@/lib/content/paths";
import type { EditorTarget } from "./types";
import { useT } from "@/lib/i18n/useT";

export function TopBar({
  target,
  status,
  onRename,
  onSave,
  onPublish,
  onOpenSettings,
  onOpenVersions,
  publishing,
}: {
  target: EditorTarget;
  status: { published: boolean; hasUnpublished: boolean; publishedAt: string | null };
  onRename: (name: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onOpenSettings: () => void;
  onOpenVersions: () => void;
  publishing: boolean;
}) {
  const saveState = useEditor((s) => s.saveState);
  const t = useT();
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const showGrid = useEditor((s) => s.showGrid);
  const toggleGrid = useEditor((s) => s.toggleGrid);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(target.name);

  const previewHref = `/preview/?type=${target.type}&id=${target.id}`;
  const liveHref = withBase(target.type === "project" ? `/projects/${target.slug}/` : target.slug === "home" ? "/" : `/${target.slug}/`);
  const backHref = target.type === "project" ? "/admin/projects" : "/admin/pages";

  const stateLabel =
    saveState === "saving" ? { t: t("Saving…"), c: "text-neutral-400" } : saveState === "unsaved" ? { t: t("Unsaved changes"), c: "text-amber-700" } : saveState === "error" ? { t: t("Save failed — retrying"), c: "text-red-600" } : { t: t("Saved"), c: "text-neutral-400" };
  const pubLabel = !status.published ? { t: t("Draft"), c: "bg-neutral-200 text-neutral-700" } : status.hasUnpublished || saveState !== "saved" ? { t: t("Unpublished changes"), c: "bg-amber-100 text-amber-800" } : { t: t("Published"), c: "bg-emerald-100 text-emerald-800" };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3">
      <Link href={backHref} className="text-[12px] text-neutral-500 hover:text-neutral-900">← {t(target.type === "project" ? "Projects" : "Pages")}</Link>
      <span className="text-neutral-200">|</span>
      {editing ? (
        <input
          className="ui-input h-7 max-w-64 text-[13px]"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => { setEditing(false); if (name.trim() && name !== target.name) onRename(name.trim()); }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setName(target.name); setEditing(false); } }}
        />
      ) : (
        <button className="max-w-64 truncate text-[13px] font-medium hover:underline" title="Click to rename" onClick={() => target.type === "project" && setEditing(true)}>
          {target.name}
        </button>
      )}
      <span className={`rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${pubLabel.c}`}>{pubLabel.t}</span>
      <span className={`text-[11px] ${stateLabel.c}`}>{stateLabel.t}</span>

      <div className="mx-auto flex items-center gap-2">
        <div className="ui-seg">
          <button onClick={undo} disabled={!canUndo} title={`${t("Undo")} (⌘Z)`} className="disabled:opacity-30">↶</button>
          <button onClick={redo} disabled={!canRedo} title={`${t("Redo")} (⌘⇧Z)`} className="disabled:opacity-30">↷</button>
        </div>
        <div className="ui-seg">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <button key={d} data-active={device === d} onClick={() => setDevice(d)}>{t(d[0].toUpperCase() + d.slice(1))}</button>
          ))}
        </div>
        <button className={`ui-btn h-7 ${showGrid ? "ui-btn-primary" : ""}`} onClick={toggleGrid} title={t("Grid")}>{t("Grid")}</button>
      </div>

      <button className="ui-btn h-7" onClick={onOpenVersions}>{t("Versions")}</button>
      {target.type === "project" ? <button className="ui-btn h-7" onClick={onOpenSettings}>{t("Project settings")}</button> : <button className="ui-btn h-7" onClick={onOpenSettings}>{t("Page settings")}</button>}
      <button className="ui-btn h-7" onClick={onSave} disabled={saveState === "saved" || saveState === "saving"}>{t("Save draft")}</button>
      <Link className="ui-btn h-7" href={previewHref} target="_blank">{t("Preview ↗")}</Link>
      {status.published && !status.hasUnpublished ? <a className="text-[11px] text-neutral-500 hover:underline" href={liveHref} target="_blank" rel="noreferrer">{t("Live ↗")}</a> : null}
      <button className="ui-btn ui-btn-primary h-7" onClick={onPublish} disabled={publishing}>{publishing ? t("Publishing…") : t("Publish")}</button>
    </header>
  );
}
