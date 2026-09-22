"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fallbackUrl, srcset, type PhotoView } from "@/lib/photos/view";

type Ctx = { open: (photo: PhotoView) => void };
const LightboxContext = createContext<Ctx>({ open: () => {} });

export function useLightbox() {
  return useContext(LightboxContext);
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [photo, setPhoto] = useState<PhotoView | null>(null);
  const open = useCallback((p: PhotoView) => setPhoto(p), []);
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhoto(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [photo]);
  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      {photo ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0c0c0c] text-[#e9e6df]"
          onClick={() => setPhoto(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-4 text-[10.5px] tracking-[0.14em] uppercase text-[#b8b4ac]">
            <span>{[photo.title, photo.location, photo.year].filter(Boolean).join(" — ")}</span>
            <button className="hover:text-white" onClick={() => setPhoto(null)}>
              Close ✕
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-6 pt-0">
            <picture>
              {photo.sources.avif.length ? <source type="image/avif" srcSet={srcset(photo.sources.avif)} sizes="100vw" /> : null}
              {photo.sources.webp.length ? <source type="image/webp" srcSet={srcset(photo.sources.webp)} sizes="100vw" /> : null}
              <img
                src={fallbackUrl(photo)}
                alt={photo.alt || photo.title}
                className="max-h-[calc(100vh-6rem)] max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </picture>
          </div>
        </div>
      ) : null}
    </LightboxContext.Provider>
  );
}
