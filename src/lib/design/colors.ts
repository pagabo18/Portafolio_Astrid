/**
 * Curated editorial palette. Backgrounds and text colours are chosen so any
 * combination still reads like one publication; a custom hex is available as
 * an escape hatch.
 */
export type SwatchKey = keyof typeof SWATCHES;

export const SWATCHES = {
  // paper / light
  default: { name: "Paper", value: "", group: "light" }, // inherits the site theme
  white: { name: "White", value: "#ffffff", group: "light" },
  offwhite: { name: "Off white", value: "#ebe8e2", group: "light" },
  sand: { name: "Sand", value: "#e7dfd2", group: "light" },
  linen: { name: "Linen", value: "#f2ece1", group: "light" },
  mist: { name: "Mist", value: "#e4e6e6", group: "light" },
  stone: { name: "Stone", value: "#d8d5cf", group: "light" },
  // mid
  clay: { name: "Clay", value: "#b9a894", group: "mid" },
  sage: { name: "Sage", value: "#a8b1a3", group: "mid" },
  slate: { name: "Slate", value: "#8a8f95", group: "mid" },
  // dark
  ink: { name: "Ink", value: "#141414", group: "dark" },
  black: { name: "Black", value: "#0c0c0c", group: "dark" },
  charcoal: { name: "Charcoal", value: "#232323", group: "dark" },
  espresso: { name: "Espresso", value: "#2a211c", group: "dark" },
  midnight: { name: "Midnight", value: "#141a24", group: "dark" },
  forest: { name: "Forest", value: "#1b2620", group: "dark" },
  wine: { name: "Wine", value: "#2a1a1e", group: "dark" },
} as const satisfies Record<string, { name: string; value: string; group: "light" | "mid" | "dark" }>;

export const SWATCH_KEYS = Object.keys(SWATCHES) as SwatchKey[];

export const TEXT_SWATCHES = {
  auto: { name: "Auto", value: "" }, // follows the background
  ink: { name: "Ink", value: "#141414" },
  soft: { name: "Soft ink", value: "#4b4b4b" },
  muted: { name: "Muted", value: "#8a8a8a" },
  white: { name: "White", value: "#ffffff" },
  cream: { name: "Cream", value: "#e9e6df" },
  sand: { name: "Sand", value: "#c9bda9" },
  rust: { name: "Rust", value: "#8a4b33" },
  olive: { name: "Olive", value: "#5d6647" },
  navy: { name: "Navy", value: "#26364d" },
} as const;
export type TextSwatchKey = keyof typeof TEXT_SWATCHES;
export const TEXT_SWATCH_KEYS = Object.keys(TEXT_SWATCHES) as TextSwatchKey[];

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export const isHex = (v: string) => HEX.test(v.trim());

/** Resolve a stored value (palette key or #hex) to a CSS colour, or "" for inherit. */
export function resolveColor(v: string | null | undefined, table: Record<string, { value: string }>): string {
  if (!v) return "";
  if (isHex(v)) return v.trim();
  return table[v]?.value ?? "";
}

export const resolveBackground = (v: string | null | undefined) => resolveColor(v, SWATCHES);
export const resolveText = (v: string | null | undefined) => resolveColor(v, TEXT_SWATCHES);

/** Perceived luminance, used to pick readable defaults over a background. */
export function luminance(hex: string) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

export function isDarkBackground(v: string | null | undefined) {
  const c = resolveBackground(v);
  return !!c && luminance(c) < 0.45;
}
