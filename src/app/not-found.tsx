import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-[var(--margin)] text-center">
      <span className="ed-chapter-number">404</span>
      <p className="ed-title">Page not found</p>
      <Link href="/" className="eyebrow hover:text-ink">
        ← Back to work
      </Link>
    </div>
  );
}
