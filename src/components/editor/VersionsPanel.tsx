"use client";

import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client/api";
import { Modal } from "@/components/admin/ui/Modal";
import type { BlocksDocument } from "@/lib/blocks/schema";

type V = { id: string; kind: string; label: string; createdAt: string };

export function VersionsPanel({ open, onClose, targetType, targetId, onRestore }: { open: boolean; onClose: () => void; targetType: "project" | "page"; targetId: string; onRestore: (doc: BlocksDocument) => void }) {
  const [list, setList] = useState<V[]>([]);
  const [busy, setBusy] = useState(false);
  const base = `/api/admin/${targetType === "project" ? "projects" : "pages"}/${targetId}/versions`;

  useEffect(() => {
    if (open) api<V[]>(base).then(setList);
  }, [open, base]);

  async function snapshot() {
    const label = window.prompt("Label for this snapshot", "Snapshot") ?? "Snapshot";
    setBusy(true);
    setList(await api<V[]>(base, { method: "POST", json: { label } }));
    setBusy(false);
  }

  async function restore(v: V) {
    const full = await api<{ document: BlocksDocument }>(`/api/admin/versions/${v.id}`);
    onRestore(full.document);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Version history" width="max-w-md" footer={<><button className="ui-btn" onClick={snapshot} disabled={busy}>Snapshot current draft</button><button className="ui-btn ui-btn-primary" onClick={onClose}>Close</button></>}>
      <ul className="divide-y divide-neutral-100">
        {list.map((v) => (
          <li key={v.id} className="flex items-center justify-between px-5 py-3 text-[12px]">
            <div>
              <div>{v.label || v.kind}</div>
              <div className="text-[11px] text-neutral-400">{new Date(v.createdAt).toLocaleString()} · {timeAgo(v.createdAt)} · {v.kind}</div>
            </div>
            <button className="ui-btn h-7" onClick={() => restore(v)}>Restore</button>
          </li>
        ))}
        {!list.length ? <li className="px-5 py-8 text-center text-[12px] text-neutral-400">No versions yet. Publishing creates one automatically.</li> : null}
      </ul>
      <p className="px-5 pb-4 text-[10.5px] text-neutral-400">Restoring loads the layout into the editor as an undoable change; nothing is published until you press Publish.</p>
    </Modal>
  );
}
