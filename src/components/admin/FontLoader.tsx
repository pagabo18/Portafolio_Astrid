"use client";

import { useEffect } from "react";
import { googleFontsUrl } from "@/lib/design/fonts";

/**
 * Makes sure the families used in the editor are available while previewing,
 * before anything is deployed. One stylesheet, replaced as the set grows.
 */
export function useFonts(keys: (string | undefined | null)[]) {
  const url = googleFontsUrl(keys.filter((k): k is string => !!k));
  useEffect(() => {
    if (!url) return;
    const id = "pf-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  }, [url]);
}

/** Loads one family on demand, for previews inside pickers. */
export function FontPreloader({ families }: { families: string[] }) {
  useFonts(families);
  return null;
}
