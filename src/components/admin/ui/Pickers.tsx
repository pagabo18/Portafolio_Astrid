"use client";

import { useState } from "react";
import { FONTS, FONT_GROUPS, FONT_KEYS, GROUP_LABEL, fontStack, isFontKey, type FontKey } from "@/lib/design/fonts";
import { SWATCHES, SWATCH_KEYS, TEXT_SWATCHES, TEXT_SWATCH_KEYS, isHex } from "@/lib/design/colors";
import { useFonts } from "@/components/admin/FontLoader";
import { useT } from "@/lib/i18n/useT";
import { Modal } from "./Modal";

/* ------------------------------------------------------------------ */
/* Anchor: a 3x3 pad, like a UI anchor in a game engine                 */
/* ------------------------------------------------------------------ */

export type AnchorX = "left" | "center" | "right" | "custom";
export type AnchorY = "top" | "center" | "bottom";

export function AnchorPad({ x, y, onChange }: { x: AnchorX; y: AnchorY; onChange: (x: AnchorX, y: AnchorY) => void }) {
  const t = useT();
  const cols: Exclude<AnchorX, "custom">[] = ["left", "center", "right"];
  const rows: AnchorY[] = ["top", "center", "bottom"];
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-neutral-200 bg-neutral-200">
        {rows.map((ry) =>
          cols.map((cx) => {
            const active = x === cx && y === ry;
            return (
              <button
                key={`${cx}-${ry}`}
                type="button"
                title={`${t(cx[0].toUpperCase() + cx.slice(1))} · ${t(ry[0].toUpperCase() + ry.slice(1))}`}
                onClick={() => onChange(cx, ry)}
                className={`grid h-7 w-7 place-items-center bg-white transition hover:bg-neutral-100 ${active ? "bg-neutral-900 hover:bg-neutral-900" : ""}`}
              >
                <span className={`h-2 w-2 rounded-[1px] ${active ? "bg-white" : "bg-neutral-300"}`} />
              </button>
            );
          }),
        )}
      </div>
      <div className="text-[10.5px] leading-snug text-neutral-500">
        <div className="text-neutral-800">
          {x === "custom" ? t("Free") : t(x[0].toUpperCase() + x.slice(1))} · {t(y[0].toUpperCase() + y.slice(1))}
        </div>
        {x !== "custom" ? (
          <button type="button" className="mt-0.5 hover:text-neutral-900 underline" onClick={() => onChange("custom", y)}>
            {t("Free")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fonts                                                                */
/* ------------------------------------------------------------------ */

export function FontPicker({ value, onChange, allowInherit, inheritLabel }: { value: string; onChange: (v: string) => void; allowInherit?: boolean; inheritLabel?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  useFonts(FONT_KEYS);
  const label = isFontKey(value) ? FONTS[value].name : inheritLabel ?? t("Auto");
  return (
    <>
      <button type="button" className="ui-btn w-full justify-between" onClick={() => setOpen(true)} style={{ fontFamily: isFontKey(value) ? fontStack(value) : undefined }}>
        <span className="truncate">{label}</span>
        <span>▾</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Font")} width="max-w-2xl">
        <div className="p-4">
          {allowInherit ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={`mb-3 w-full rounded-sm border p-3 text-left text-[12px] ${!isFontKey(value) ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
            >
              {inheritLabel ?? t("Auto")}
            </button>
          ) : null}
          {FONT_GROUPS.map((g) => {
            const keys = FONT_KEYS.filter((k) => FONTS[k].group === g);
            if (!keys.length) return null;
            return (
              <div key={g} className="mb-4">
                <div className="eyebrow mb-1.5">{GROUP_LABEL[g]}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {keys.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        onChange(k);
                        setOpen(false);
                      }}
                      className={`rounded-sm border px-3 py-2.5 text-left transition hover:border-neutral-900 ${value === k ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}
                    >
                      <div className="text-[19px] leading-tight" style={{ fontFamily: fontStack(k as FontKey) }}>
                        Aa Bb Cc
                      </div>
                      <div className="mt-1 text-[10.5px] text-neutral-500">{FONTS[k].name}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Colour                                                               */
/* ------------------------------------------------------------------ */

export function ColorPicker({ value, onChange, kind = "background" }: { value: string; onChange: (v: string) => void; kind?: "background" | "text" }) {
  const t = useT();
  const [custom, setCustom] = useState(isHex(value) ? value : "");
  const table = kind === "background" ? (SWATCHES as Record<string, { name: string; value: string }>) : (TEXT_SWATCHES as Record<string, { name: string; value: string }>);
  const keys = kind === "background" ? SWATCH_KEYS : TEXT_SWATCH_KEYS;
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {keys.map((k) => {
          const sw = table[k];
          const active = value === k;
          const isAuto = !sw.value;
          return (
            <button
              key={k}
              type="button"
              title={t(sw.name)}
              onClick={() => onChange(k)}
              className={`h-6 w-6 rounded-sm border transition ${active ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-1" : "border-neutral-300 hover:border-neutral-500"}`}
              style={
                isAuto
                  ? { backgroundImage: "linear-gradient(135deg,#fff 46%,#d4d4d4 46%,#d4d4d4 54%,#fff 54%)" }
                  : { backgroundColor: sw.value }
              }
            />
          );
        })}
        <label
          className={`flex h-6 items-center gap-1 rounded-sm border px-1.5 text-[10px] ${isHex(value) ? "border-neutral-900" : "border-neutral-300"}`}
          title="#hex"
        >
          <input
            type="color"
            className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0"
            value={isHex(value) ? value : custom || "#888888"}
            onChange={(e) => {
              setCustom(e.target.value);
              onChange(e.target.value);
            }}
          />
          <span className="text-neutral-500">hex</span>
        </label>
      </div>
      <div className="mt-1 text-[10.5px] text-neutral-400">{isHex(value) ? value : t(table[value]?.name ?? "Auto")}</div>
    </div>
  );
}
