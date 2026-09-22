"use client";

import type { ReactNode } from "react";

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="ui-label">{label}</label>
      {children}
      {hint ? <p className="mt-1 text-[10.5px] text-neutral-400">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, size }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; size?: "sm" }) {
  return (
    <div className={`ui-seg ${size === "sm" ? "[&>button]:h-6 [&>button]:min-w-6 [&>button]:px-1.5 [&>button]:text-[10.5px]" : ""}`}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" data-active={o.value === value} onClick={() => onChange(o.value)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ui-check cursor-pointer">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Select<T extends string>({ value, options, onChange, placeholder }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; placeholder?: string }) {
  return (
    <select className="ui-input" value={value} onChange={(e) => onChange(e.target.value as T)}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Small stepper for grid units (-4..4 etc). */
export function Stepper({ value, min, max, onChange, format }: { value: number; min: number; max: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <div className="ui-seg">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <span className="grid h-7 min-w-10 place-items-center px-2 text-[11px] tabular-nums">{format ? format(value) : value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}
