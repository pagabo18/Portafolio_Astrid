"use client";

import { useState } from "react";
import { saveSite, useAdminState } from "@/lib/content/admin";
import type { SiteSettings } from "@/lib/content/types";
import { repoFromEnv } from "@/lib/github/client";
import { ColorPicker, FontPicker } from "./ui/Pickers";
import { useT } from "@/lib/i18n/useT";
import { setLang, useLang } from "@/lib/i18n/useT";

function F({ s, set, label, k, textarea }: { s: SiteSettings; set: <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => void; label: string; k: keyof SiteSettings; textarea?: boolean }) {
  return (
    <div>
      <label className="ui-label">{label}</label>
      {textarea ? (
        <textarea className="ui-input min-h-20" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <input className="ui-input" value={String(s[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      )}
    </div>
  );
}

export function SettingsForm() {
  const t = useT();
  const lang = useLang();
  const initial = useAdminState((s) => s.site);
  const [s, setS] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const env = repoFromEnv();
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    try {
      setS(await saveSite(s));
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <div className="eyebrow">{t("Settings")}</div>
        <h1 className="mt-1 text-2xl font-light">{t("Site settings")}</h1>
      </div>
      <form onSubmit={save} className="ui-card space-y-4 p-6">
        <h2 className="eyebrow">{t("Identity")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <F s={s} set={set} label={t("Site name")} k="siteName" />
          <F s={s} set={set} label={t("Tagline")} k="tagline" />
          <F s={s} set={set} label={t("Author name")} k="authorName" />
          <F s={s} set={set} label={t("Email")} k="email" />
          <F s={s} set={set} label={t("Instagram")} k="instagram" />
          <div>
            <label className="ui-label">{t("Language")}</label>
            <div className="ui-seg">
              {(["es", "en"] as const).map((l) => (
                <button type="button" key={l} data-active={lang === l} onClick={() => { setLang(l); set("adminLanguage", l); }}>
                  {l === "es" ? "Español" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="ui-label">{t("Theme")}</label>
            <div className="ui-seg">
              {(["paper", "white"] as const).map((tk) => (
                <button type="button" key={tk} data-active={s.theme === tk} onClick={() => set("theme", tk)}>{tk}</button>
              ))}
            </div>
          </div>
        </div>
        <h2 className="eyebrow pt-4">{t("Typography")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="ui-label">{t("Body font")}</label>
            <FontPicker value={s.fontBody} onChange={(v) => set("fontBody", v)} />
          </div>
          <div>
            <label className="ui-label">{t("Heading font")}</label>
            <FontPicker value={s.fontHeading} onChange={(v) => set("fontHeading", v)} allowInherit inheritLabel={t("Same as body")} />
          </div>
        </div>
        <h2 className="eyebrow pt-4">{t("Colour")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="ui-label">{t("Page background")}</label>
            <ColorPicker value={s.pageBackground} onChange={(v) => set("pageBackground", v)} />
          </div>
          <div>
            <label className="ui-label">{t("Default text colour")}</label>
            <ColorPicker kind="text" value={s.pageText} onChange={(v) => set("pageText", v)} />
          </div>
        </div>
        <h2 className="eyebrow pt-4">{t("SEO defaults")}</h2>
        <F s={s} set={set} label={t("Default SEO title")} k="seoTitle" />
        <F s={s} set={set} label={t("Default SEO description")} k="seoDescription" textarea />
        <F s={s} set={set} label={t("Footer text")} k="footerText" />
        <h2 className="eyebrow pt-4">{t("Navigation")}</h2>
        <div className="space-y-2">
          {s.nav.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input className="ui-input" value={n.label} onChange={(e) => set("nav", s.nav.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={t("Label")} />
              <input className="ui-input" value={n.href} onChange={(e) => set("nav", s.nav.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} placeholder="/path" />
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => set("nav", s.nav.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="ui-btn" onClick={() => set("nav", [...s.nav, { label: "Link", href: "/" }])}>{t("+ Add link")}</button>
        </div>
        <h2 className="eyebrow pt-4">{t("Uploads")}</h2>
        <div>
          <label className="ui-label">{t("Downscale originals on upload")}</label>
          <div className="ui-seg">
            {[[4000, "4000 px"], [3000, "3000 px"], [2400, "2400 px"], [0, t("Keep original")]].map(([v, l]) => (
              <button type="button" key={v} data-active={s.uploadMaxPx === v} onClick={() => set("uploadMaxPx", v as number)}>{l}</button>
            ))}
          </div>
          <p className="mt-1 text-[10.5px] text-neutral-400">{t("Originals are stored in the repository. Downscaling keeps the repo small; the largest web variant is 2400 px anyway.")}</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button className="ui-btn ui-btn-primary" disabled={state === "saving"}>{state === "saving" ? t("Saving…") : t("Save settings")}</button>
          {state === "saved" ? <span className="text-[12px] text-emerald-700">{t("Saved — deploys with the next build")}</span> : null}
          {state === "error" ? <span className="text-[12px] text-red-600">{t("Could not save")}</span> : null}
        </div>
      </form>
      <div className="ui-card mt-6 p-6 text-[12px] text-neutral-600">
        <h2 className="eyebrow mb-3">{t("Infrastructure")}</h2>
        <p>Content repository: <span className="text-neutral-900">{env.owner}/{env.repo}</span> · branch <span className="text-neutral-900">{env.branch}</span></p>
        <p>Hosting: GitHub Pages, built by GitHub Actions on every publish.</p>
        <p className="mt-2 text-neutral-500">To change the access token, log out and sign in again.</p>
      </div>
    </div>
  );
}
