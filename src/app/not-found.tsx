import Link from "next/link";
import { loadSite } from "@/lib/content/server";
import { pt } from "@/lib/content/public-strings";

export default function NotFound() {
  const lang = loadSite().adminLanguage;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-[var(--margin)] text-center">
      <span className="ed-chapter-number">404</span>
      <p className="ed-title">{pt(lang, "Page not found")}</p>
      <Link href="/" className="eyebrow hover:text-ink">
        ← {pt(lang, "Back to work")}
      </Link>
    </div>
  );
}
