"use client";

import { useState } from "react";
import type { Block, BlockType } from "@/lib/blocks/schema";
import { BLOCK_TYPE_INFO, GROUP_LAYOUT_INFO, SINGLE_LAYOUT_INFO, createBlock, type LayoutInfo } from "@/lib/blocks/templates";
import type { PhotoView } from "@/lib/photos/view";
import { Modal } from "@/components/admin/ui/Modal";

/**
 * + ADD BLOCK → choose a type (and for images, a layout) → pick photos.
 */
export function AddBlockMenu({
  open,
  onClose,
  scope,
  onInsert,
  onPickPhotos,
}: {
  open: boolean;
  onClose: () => void;
  scope: "project" | "page";
  onInsert: (block: Block, photos: PhotoView[]) => void;
  onPickPhotos: (opts: { multiple: boolean; onPick: (p: PhotoView[]) => void }) => void;
}) {
  const [step, setStep] = useState<"type" | "layout">("type");
  const types = BLOCK_TYPE_INFO.filter((t) => t.scope.includes(scope));

  function choose(type: BlockType) {
    if (type === "image" || type === "image-group") {
      setStep("layout");
      return;
    }
    onInsert(createBlock(type), []);
    close();
  }

  function chooseLayout(l: LayoutInfo) {
    close();
    const multiple = l.kind === "group";
    onPickPhotos({
      multiple,
      onPick: (photos) => {
        const block = createBlock(l.kind === "single" ? "image" : "image-group", { photoIds: photos.map((p) => p.id), layout: l.id });
        onInsert(block, photos);
      },
    });
  }

  function close() {
    setStep("type");
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title={step === "type" ? "Add block" : "Choose a layout"} width="max-w-3xl">
      {step === "type" ? (
        <div className="grid grid-cols-3 gap-2 p-4">
          {types.map((t) => (
            <button key={t.type} onClick={() => choose(t.type)} className="rounded-sm border border-neutral-200 p-4 text-left transition hover:border-neutral-900">
              <div className="text-[13px]">{t.name}</div>
              <div className="mt-1 text-[11px] text-neutral-500">{t.description}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <button className="mb-3 text-[11px] text-neutral-500 hover:text-neutral-900" onClick={() => setStep("type")}>← Back</button>
          <div className="grid grid-cols-3 gap-2">
            {[...Object.values(SINGLE_LAYOUT_INFO), ...Object.values(GROUP_LAYOUT_INFO)]
              .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
              .map((l) => (
                <button key={l.id} onClick={() => chooseLayout(l)} className="rounded-sm border border-neutral-200 p-3 text-left transition hover:border-neutral-900">
                  <pre className="mb-2 whitespace-pre font-mono text-[10px] leading-[14px] text-neutral-700">{l.sketch.join("\n")}</pre>
                  <div className="text-[11px]"><span className="text-neutral-400">{l.number}</span> — {l.name}</div>
                  <div className="text-[10.5px] text-neutral-500">{l.description}</div>
                </button>
              ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
