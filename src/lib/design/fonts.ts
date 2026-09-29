/**
 * Curated type library. Families are loaded from Google Fonts only when a
 * page actually uses them, so the public site stays light.
 */
export type FontKey = keyof typeof FONTS;

export const FONTS = {
  // --- Sans -----------------------------------------------------------
  helvetica: { name: "Helvetica Neue", group: "sans", stack: '"Helvetica Neue", Helvetica, Arial, sans-serif', google: null },
  inter: { name: "Inter", group: "sans", stack: '"Inter", system-ui, sans-serif', google: "Inter:wght@200;300;400;500;600" },
  dmsans: { name: "DM Sans", group: "sans", stack: '"DM Sans", system-ui, sans-serif', google: "DM+Sans:opsz,wght@9..40,200;9..40,300;9..40,400;9..40,500" },
  worksans: { name: "Work Sans", group: "sans", stack: '"Work Sans", system-ui, sans-serif', google: "Work+Sans:wght@200;300;400;500" },
  jost: { name: "Jost", group: "sans", stack: '"Jost", system-ui, sans-serif', google: "Jost:wght@200;300;400;500" },
  archivo: { name: "Archivo", group: "sans", stack: '"Archivo", system-ui, sans-serif', google: "Archivo:wght@200;300;400;500;600" },
  spacegrotesk: { name: "Space Grotesk", group: "sans", stack: '"Space Grotesk", system-ui, sans-serif', google: "Space+Grotesk:wght@300;400;500" },
  figtree: { name: "Figtree", group: "sans", stack: '"Figtree", system-ui, sans-serif', google: "Figtree:wght@300;400;500;600" },

  // --- Serif ----------------------------------------------------------
  cormorant: { name: "Cormorant Garamond", group: "serif", stack: '"Cormorant Garamond", Georgia, serif', google: "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400" },
  ebgaramond: { name: "EB Garamond", group: "serif", stack: '"EB Garamond", Georgia, serif', google: "EB+Garamond:ital,wght@0,400;0,500;1,400" },
  playfair: { name: "Playfair Display", group: "serif", stack: '"Playfair Display", Georgia, serif', google: "Playfair+Display:ital,wght@0,400;0,500;0,600;1,400" },
  lora: { name: "Lora", group: "serif", stack: '"Lora", Georgia, serif', google: "Lora:ital,wght@0,400;0,500;1,400" },
  spectral: { name: "Spectral", group: "serif", stack: '"Spectral", Georgia, serif', google: "Spectral:ital,wght@0,300;0,400;0,500;1,300" },
  librebaskerville: { name: "Libre Baskerville", group: "serif", stack: '"Libre Baskerville", Georgia, serif', google: "Libre+Baskerville:ital,wght@0,400;1,400" },

  // --- Display --------------------------------------------------------
  bodoni: { name: "Bodoni Moda", group: "display", stack: '"Bodoni Moda", Didot, serif', google: "Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400" },
  instrument: { name: "Instrument Serif", group: "display", stack: '"Instrument Serif", Georgia, serif', google: "Instrument+Serif:ital@0;1" },
  syne: { name: "Syne", group: "display", stack: '"Syne", system-ui, sans-serif', google: "Syne:wght@400;500;600;700" },
  unbounded: { name: "Unbounded", group: "display", stack: '"Unbounded", system-ui, sans-serif', google: "Unbounded:wght@200;300;400;500" },

  // --- Mono -----------------------------------------------------------
  jetbrains: { name: "JetBrains Mono", group: "mono", stack: '"JetBrains Mono", ui-monospace, monospace', google: "JetBrains+Mono:wght@300;400;500" },
  plexmono: { name: "IBM Plex Mono", group: "mono", stack: '"IBM Plex Mono", ui-monospace, monospace', google: "IBM+Plex+Mono:wght@300;400;500" },
} as const satisfies Record<string, { name: string; group: "sans" | "serif" | "display" | "mono"; stack: string; google: string | null }>;

export const FONT_KEYS = Object.keys(FONTS) as FontKey[];
export const FONT_GROUPS = ["sans", "serif", "display", "mono"] as const;
export const GROUP_LABEL: Record<(typeof FONT_GROUPS)[number], string> = { sans: "Sans", serif: "Serif", display: "Display", mono: "Mono" };

export function isFontKey(v: unknown): v is FontKey {
  return typeof v === "string" && v in FONTS;
}

export function fontStack(key: string | null | undefined, fallback: FontKey = "helvetica") {
  return FONTS[isFontKey(key) ? key : fallback].stack;
}

/** One Google Fonts stylesheet URL for a set of families (null if none need it). */
export function googleFontsUrl(keys: Iterable<string>): string | null {
  const families = [...new Set(keys)]
    .filter(isFontKey)
    .map((k) => FONTS[k].google as string | null)
    .filter((g) => !!g)
    .map((g) => g as string)
    .sort();
  if (!families.length) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}
