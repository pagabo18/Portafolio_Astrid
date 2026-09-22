"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import type { SiteSettings } from "@/lib/data/settings";

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

export function SettingsForm({ initial, storageDriver, database }: { initial: SiteSettings; storageDriver: string; database: string }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    try {
      setS(await api<SiteSettings>("/api/admin/settings", { method: "PUT", json: s }));
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) return setPwMsg("Passwords do not match.");
    try {
      await api("/api/admin/account/password", { method: "POST", json: { current: pw.current, next: pw.next } });
      setPwMsg("Password updated. Please sign in again.");
      setTimeout(() => router.replace("/admin/login"), 1200);
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="ui-card space-y-4 p-6">
        <h2 className="eyebrow">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <F s={s} set={set} label="Site name" k="siteName" />
          <F s={s} set={set} label="Tagline" k="tagline" />
          <F s={s} set={set} label="Author name" k="authorName" />
          <F s={s} set={set} label="Email" k="email" />
          <F s={s} set={set} label="Instagram" k="instagram" />
          <div>
            <label className="ui-label">Theme</label>
            <div className="ui-seg">
              {(["paper", "white"] as const).map((t) => (
                <button type="button" key={t} data-active={s.theme === t} onClick={() => set("theme", t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <h2 className="eyebrow pt-4">SEO defaults</h2>
        <F s={s} set={set} label="Default SEO title" k="seoTitle" />
        <F s={s} set={set} label="Default SEO description" k="seoDescription" textarea />
        <F s={s} set={set} label="Footer text" k="footerText" />
        <h2 className="eyebrow pt-4">Navigation</h2>
        <div className="space-y-2">
          {s.nav.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input className="ui-input" value={n.label} onChange={(e) => set("nav", s.nav.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label" />
              <input className="ui-input" value={n.href} onChange={(e) => set("nav", s.nav.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} placeholder="/path" />
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => set("nav", s.nav.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="ui-btn" onClick={() => set("nav", [...s.nav, { label: "Link", href: "/" }])}>
            + Add link
          </button>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button className="ui-btn ui-btn-primary" disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Save settings"}
          </button>
          {state === "saved" ? <span className="text-[12px] text-emerald-700">Saved</span> : null}
          {state === "error" ? <span className="text-[12px] text-red-600">Could not save</span> : null}
        </div>
      </form>

      <form onSubmit={changePassword} className="ui-card space-y-4 p-6">
        <h2 className="eyebrow">Account · change password</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="ui-label">Current</label>
            <input type="password" className="ui-input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" />
          </div>
          <div>
            <label className="ui-label">New (10+ chars)</label>
            <input type="password" className="ui-input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" />
          </div>
          <div>
            <label className="ui-label">Confirm</label>
            <input type="password" className="ui-input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
          </div>
        </div>
        {pwMsg ? <p className="text-[12px] text-neutral-700">{pwMsg}</p> : null}
        <button className="ui-btn">Update password</button>
      </form>

      <div className="ui-card p-6 text-[12px] text-neutral-600">
        <h2 className="eyebrow mb-3">Infrastructure</h2>
        <p>Database: <span className="text-neutral-900">{database}</span></p>
        <p>Storage driver: <span className="text-neutral-900">{storageDriver}</span></p>
        <p className="mt-2 text-neutral-500">Configured through environment variables — see README.</p>
      </div>
    </div>
  );
}
