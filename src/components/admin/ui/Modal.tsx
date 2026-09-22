"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({ open, onClose, title, children, width = "max-w-3xl", footer }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; width?: string; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className={`flex max-h-[90vh] w-full ${width} flex-col overflow-hidden rounded-sm bg-white shadow-2xl`} onMouseDown={(e) => e.stopPropagation()}>
        {title ? (
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
            <div className="text-[13px] font-medium">{title}</div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900" aria-label="Close">
              ✕
            </button>
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", danger = true, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void | Promise<void>; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} width="max-w-sm" title={title} footer={
      <>
        <button className="ui-btn" onClick={onClose}>Cancel</button>
        <button className={`ui-btn ${danger ? "ui-btn-danger" : "ui-btn-primary"}`} onClick={async () => { await onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>
    }>
      <p className="px-5 py-4 text-[13px] text-neutral-700">{message}</p>
    </Modal>
  );
}
