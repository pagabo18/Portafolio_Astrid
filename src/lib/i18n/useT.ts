"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readStoredLang, storeLang, translate, type Lang } from "./index";

/**
 * Admin language. Kept in localStorage so it applies before any content
 * loads, and mirrored into the site settings so it follows the account.
 */
let current: Lang | null = null;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function snapshot(): Lang {
  if (current === null) current = readStoredLang();
  return current;
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  storeLang(lang);
  listeners.forEach((fn) => fn());
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, snapshot, () => "es" as Lang);
}

/** t("Save draft") → "Guardar borrador" */
export function useT() {
  const lang = useLang();
  return useCallback((key: string) => translate(lang, key), [lang]);
}
