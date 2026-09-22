"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/client/api";
import { listVersions, readVersionDocument, type VersionInfo } from "@/lib/content/admin";
import { Modal } from "@/components/admin/ui/Modal";
import type { BlocksDocument } from "@/lib/blocks/schema";

/** Version history = the git history of this project/page. */
export function VersionsPanel(props: { open: boolean; onClose: () => void; targetType: "project" | "page"; targetId: string; onRestore: (doc: BlocksDocument) => void }) {
  if (!props.open) return null;
  return <VersionsBody {...props} />;
}

function VersionsBody({ open, onClose, targetType, targetId, onRestore }: { open: boolean; onClose: () => void; targetType: "project" | "page"; targetId: string; onRestore: (doc: BlocksDocument) => void }) {
  const [list, setList] = useState<VersionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    listVersions(targetType, targetId)
      .then((l) => alive && setList(l))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load history"));
    return () => {
      alive = false;
    };
  }, [open, targetType, targetId]);

  async function restore(v: VersionInfo) {
    const doc = await readVersionDocument(targetType, targetId, v.sha);
    if (!doc) return setError("That version has no layout to restore.");
    onRestore(doc);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Version history" width="max-w-md" footer={<button className="ui-btn ui-btn-primary" onClick={onClose}>Close</button>}>
      <ul className="divide-y divide-neutral-100">
        {(list ?? []).map((v) => (
          <li key={v.sha} className="flex items-center justify-between px-5 py-3 text-[12px]">
            <div>
              <div className={v.kind === "publish" ? "text-emerald-800" : ""}>{v.label}</div>
              <div className="text-[11px] text-neutral-400">{new Date(v.date).toLocaleString()} · {timeAgo(v.date)} · {v.sha.slice(0, 7)}</div>
            </div>
            <button className="ui-btn h-7" onClick={() => restore(v)}>Restore</button>
          </li>
        ))}
        {list === null && !error ? <li className="px-5 py-8 text-center text-[12px] text-neutral-400">Loading history…</li> : null}
        {list && !list.length ? <li className="px-5 py-8 text-center text-[12px] text-neutral-400">No commits yet for this item.</li> : null}
        {error ? <li className="px-5 py-4 text-[12px] text-red-600">{error}</li> : null}
      </ul>
      <p className="px-5 pb-4 text-[10.5px] text-neutral-400">Every save and publish is a commit. Restoring loads that layout into the editor as an undoable change; nothing is published until you press Publish.</p>
    </Modal>
  );
}
