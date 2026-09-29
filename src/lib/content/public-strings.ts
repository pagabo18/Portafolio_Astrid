/** The few strings the public site renders itself. */
const ES: Record<string, string> = {
  All: "Todas",
  "Next project": "Siguiente proyecto",
  Projects: "Proyectos",
  Index: "Índice",
  "Nothing published yet.": "Todavía no hay nada publicado.",
  "Page not found": "Página no encontrada",
  "Back to work": "Volver al inicio",
  Close: "Cerrar",
};

export function pt(lang: "es" | "en" | undefined, key: string) {
  return lang === "en" ? key : ES[key] ?? key;
}
