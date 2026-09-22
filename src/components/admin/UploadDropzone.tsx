"use client";

import { useCallback, useRef, useState } from "react";
import type { PhotoView } from "@/lib/photos/view";

type Progress = { name: string; state: "queued" | "uploading" | "done" | "error"; error?: string };

/**
 * Multi-file upload with drag & drop. Files are sent in small batches so a
 * 30-photo upload shows progress and one failure does not lose the rest.
 */
export function useUploader(onUploaded: (photos: PhotoView[]) => void, extra: { projectId?: string | null; categoryId?: string | null } = {}) {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [busy, setBusy] = useState(false);

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif|tiff?|avif)$/i.test(f.name));
      if (!images.length) return;
      setBusy(true);
      setProgress(images.map((f) => ({ name: f.name, state: "queued" })));
      const BATCH = 3;
      for (let i = 0; i < images.length; i += BATCH) {
        const batch = images.slice(i, i + BATCH);
        setProgress((p) => p.map((x) => (batch.some((b) => b.name === x.name) ? { ...x, state: "uploading" } : x)));
        const fd = new FormData();
        for (const f of batch) fd.append("files", f);
        if (extra.projectId) fd.append("projectId", extra.projectId);
        if (extra.categoryId) fd.append("categoryId", extra.categoryId);
        try {
          const res = await fetch("/api/admin/photos", { method: "POST", body: fd, credentials: "same-origin" });
          const data = (await res.json()) as { photos?: PhotoView[]; errors?: { name: string; error: string }[]; error?: string };
          if (!res.ok) throw new Error(data.error ?? "Upload failed");
          if (data.photos?.length) onUploaded(data.photos);
          setProgress((p) =>
            p.map((x) => {
              const err = data.errors?.find((e) => e.name === x.name);
              if (err) return { ...x, state: "error", error: err.error };
              if (batch.some((b) => b.name === x.name)) return { ...x, state: "done" };
              return x;
            }),
          );
        } catch (e) {
          setProgress((p) => p.map((x) => (batch.some((b) => b.name === x.name) ? { ...x, state: "error", error: e instanceof Error ? e.message : "Failed" } : x)));
        }
      }
      setBusy(false);
      setTimeout(() => setProgress((p) => (p.every((x) => x.state === "done") ? [] : p)), 2500);
    },
    [onUploaded, extra.projectId, extra.categoryId],
  );

  return { upload, progress, busy, clear: () => setProgress([]) };
}

export function UploadDropzone({ onFiles, compact, children }: { onFiles: (files: File[]) => void; compact?: boolean; children?: React.ReactNode }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      onClick={() => input.current?.click()}
      className={`cursor-pointer rounded-sm border border-dashed text-center transition ${over ? "border-neutral-900 bg-neutral-100" : "border-neutral-300 bg-white hover:border-neutral-500"} ${compact ? "px-3 py-2 text-[11px]" : "px-6 py-10 text-[12px]"} text-neutral-600`}
    >
      <input ref={input} type="file" accept="image/*,.heic,.heif,.tif,.tiff" multiple hidden onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      {children ?? (compact ? "Drop photos or click to upload" : <><div className="text-[13px] text-neutral-900">Drop photographs here</div><div className="mt-1 text-neutral-500">or click to browse · JPG, PNG, WebP, TIFF, HEIC · originals are kept, web variants generated automatically</div></>)}
    </div>
  );
}

export function UploadProgress({ progress }: { progress: Progress[] }) {
  if (!progress.length) return null;
  const done = progress.filter((p) => p.state === "done").length;
  return (
    <div className="fixed bottom-4 right-4 z-[80] w-72 rounded-sm border border-neutral-200 bg-white p-3 text-[11px] shadow-lg">
      <div className="mb-2 flex justify-between text-neutral-700">
        <span>Uploading</span>
        <span>{done}/{progress.length}</span>
      </div>
      <div className="mb-2 h-1 w-full bg-neutral-100">
        <div className="h-1 bg-neutral-900 transition-all" style={{ width: `${(done / progress.length) * 100}%` }} />
      </div>
      <ul className="max-h-32 space-y-0.5 overflow-auto">
        {progress.map((p) => (
          <li key={p.name} className={`flex justify-between gap-2 ${p.state === "error" ? "text-red-600" : p.state === "done" ? "text-neutral-400" : "text-neutral-700"}`}>
            <span className="truncate">{p.name}</span>
            <span className="shrink-0">{p.state === "error" ? p.error : p.state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
