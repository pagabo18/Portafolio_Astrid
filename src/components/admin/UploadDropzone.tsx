"use client";

import { useCallback, useRef, useState } from "react";
import type { PhotoView } from "@/lib/photos/view";
import { uploadPhotos, type UploadProgress as Progress } from "@/lib/content/admin";
import { isSupportedImage } from "@/lib/images/browser";
import { useT } from "@/lib/i18n/useT";

/** Multi-file upload with drag & drop: processed in the browser, committed one by one. */
export function useUploader(onUploaded: (photos: PhotoView[]) => void, extra: { projectId?: string | null; categoryId?: string | null } = {}) {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [busy, setBusy] = useState(false);
  const { projectId, categoryId } = extra;

  const upload = useCallback(
    async (files: File[]) => {
      const images = files.filter(isSupportedImage);
      if (!images.length) return;
      setBusy(true);
      try {
        const added = await uploadPhotos(images, { projectId, categoryId }, setProgress);
        if (added.length) onUploaded(added);
      } finally {
        setBusy(false);
        setTimeout(() => setProgress((p) => (p.every((x) => x.state === "done") ? [] : p)), 2500);
      }
    },
    [onUploaded, projectId, categoryId],
  );

  return { upload, progress, busy, clear: () => setProgress([]) };
}

export function UploadDropzone({ onFiles, compact, children }: { onFiles: (files: File[]) => void; compact?: boolean; children?: React.ReactNode }) {
  const t = useT();
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      onClick={() => input.current?.click()}
      className={`cursor-pointer rounded-sm border border-dashed text-center transition ${over ? "border-neutral-900 bg-neutral-100" : "border-neutral-300 bg-white hover:border-neutral-500"} ${compact ? "px-3 py-2 text-[11px]" : "px-6 py-10 text-[12px]"} text-neutral-600`}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      {children ?? (compact ? t("Drop photos or click to upload") : <><div className="text-[13px] text-neutral-900">{t("Drop photographs here")}</div><div className="mt-1 text-neutral-500">JPG · PNG · WebP</div></>)}
    </div>
  );
}

export function UploadProgress({ progress }: { progress: Progress[] }) {
  return progress.length ? <ProgressBody progress={progress} /> : null;
}

function ProgressBody({ progress }: { progress: Progress[] }) {
  const t = useT();
  const done = progress.filter((p) => p.state === "done").length;
  return (
    <div className="fixed bottom-4 right-4 z-[80] w-72 rounded-sm border border-neutral-200 bg-white p-3 text-[11px] shadow-lg">
      <div className="mb-2 flex justify-between text-neutral-700">
        <span>{t("Uploading")}</span>
        <span>{done}/{progress.length}</span>
      </div>
      <div className="mb-2 h-1 w-full bg-neutral-100">
        <div className="h-1 bg-neutral-900 transition-all" style={{ width: `${(done / progress.length) * 100}%` }} />
      </div>
      <ul className="max-h-32 space-y-0.5 overflow-auto">
        {progress.map((p) => (
          <li key={p.name} className={`flex justify-between gap-2 ${p.state === "error" ? "text-red-600" : p.state === "done" ? "text-neutral-400" : "text-neutral-700"}`}>
            <span className="truncate">{p.name}</span>
            <span className="shrink-0">{p.state === "error" ? p.error : t(p.state)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
