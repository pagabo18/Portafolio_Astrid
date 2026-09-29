"use client";

import { useRef, useState } from "react";
import { saveSite, uploadWatermarkLogo, useAdminState } from "@/lib/content/admin";
import type { SiteSettings } from "@/lib/content/types";
import { repoFromEnv } from "@/lib/github/client";
import { ColorPicker, FontPicker } from "./ui/Pickers";
import { useT } from "@/lib/i18n/useT";
import { setLang, useLang } from "@/lib/i18n/useT";

const POSITIONS = [
  ["top-left", "top-center", "top-right"],
  ["center-left", "center", "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
] as const;

function WatermarkFields({ value, onChange }: { value: SiteSettings["watermark"]; onChange: (w: SiteSettings["watermark"]) => void }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof SiteSettings["watermark"]>(k: K, v: SiteSettings["watermark"][K]) => onChange({ ...value, [k]: v });

  return (
    <div className="rounded-sm border border-neutral-200 bg-neutral-50 p-4">
      <label className="ui-check cursor-pointer">
        <span>{t("Stamp a watermark on the photographs the site serves")}</span>
        <input type="checkbox" checked={value.enabled} onChange={(e) => set("enabled", e.target.checked)} />
      </label>
      {value.enabled ? (
        <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3">
          <div className="ui-seg">
            {(["text", "image"] as const).map((m) => (
              <button type="button" key={m} data-active={value.mode === m} onClick={() => set("mode", m)}>
                {t(m === "text" ? "Text" : "Logo")}
              </button>
            ))}
          </div>

          {value.mode === "text" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="ui-label">{t("Text")}</label>
                <input className="ui-input" value={value.text} onChange={(e) => set("text", e.target.value)} placeholder="© Astrid" />
              </div>
              <div>
                <label className="ui-label">{t("Font")}</label>
                <div className="ui-seg">
                  {(["sans", "serif", "mono"] as const).map((f) => (
                    <button type="button" key={f} data-active={value.family === f} onClick={() => set("family", f)}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="ui-label">{t("Colour")}</label>
                <div className="ui-seg">
                  {["#ffffff", "#000000"].map((c) => (
                    <button type="button" key={c} data-active={value.color === c} onClick={() => set("color", c)}>
                      {t(c === "#ffffff" ? "White" : "Black")}
                    </button>
                  ))}
                  <label className="flex h-7 items-center px-1.5">
                    <input type="color" className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0" value={value.color} onChange={(e) => set("color", e.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input ref={fileRef} type="file" accept="image/png" hidden onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setUploading(true);
                try { await uploadWatermarkLogo(f); } finally { setUploading(false); e.target.value = ""; }
              }} />
              <button type="button" className="ui-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? t("Saving…") : t("Upload logo (PNG)")}
              </button>
              <span className="text-[10.5px] text-neutral-500">{t("A PNG with a transparent background works best.")}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ui-label">{t("Position")}</label>
              <div className="grid w-fit grid-cols-3 gap-px overflow-hidden rounded-sm border border-neutral-200 bg-neutral-200">
                {POSITIONS.flat().map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => set("position", pos)}
                    className={`grid h-7 w-7 place-items-center bg-white transition hover:bg-neutral-100 ${value.position === pos ? "bg-neutral-900 hover:bg-neutral-900" : ""}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-[1px] ${value.position === pos ? "bg-white" : "bg-neutral-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="ui-label">{`${t("Size")} · ${value.size.toFixed(1)}%`}</label>
                <input type="range" min={1} max={value.mode === "text" ? 12 : 45} step={0.5} value={value.size} onChange={(e) => set("size", Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="ui-label">{`${t("Opacity")} · ${Math.round(value.opacity * 100)}%`}</label>
                <input type="range" min={0.05} max={1} step={0.05} value={value.opacity} onChange={(e) => set("opacity", Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="ui-label">{`${t("Margin")} · ${value.margin.toFixed(1)}%`}</label>
                <input type="range" min={0} max={12} step={0.5} value={value.margin} onChange={(e) => set("margin", Number(e.target.value))} className="w-full" />
              </div>
            </div>
          </div>
          <p className="text-[10.5px] leading-relaxed text-neutral-500">{t("The mark is applied when the web images are generated, so the file kept in the repository stays clean and you can change or remove the mark later. It appears after the next publish.")}</p>
        </div>
      ) : null}
    </div>
  );
}

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
        <h2 className="eyebrow pt-4">{t("Watermark")}</h2>
        <WatermarkFields value={s.watermark} onChange={(w) => set("watermark", w)} />

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
