"use client";

import { ES } from "./es";

export type Lang = "es" | "en";
export const LANG_KEY = "pf_lang";

const DICTS: Record<Lang, Record<string, string>> = { es: ES, en: {} };

/** Translate a string; unknown keys fall back to the English source. */
export function translate(lang: Lang, key: string): string {
  return DICTS[lang][key] ?? key;
}

export function readStoredLang(): Lang {
  if (typeof window === "undefined") return "es";
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "es" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
}

export function storeLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}
