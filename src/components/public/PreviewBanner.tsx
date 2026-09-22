import Link from "next/link";

export function PreviewBanner({ label, editHref }: { label: string; editHref: string }) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between bg-amber-100 px-[var(--margin)] py-2 text-[11px] tracking-wider uppercase text-amber-900">
      <span>{label}</span>
      <Link href={editHref} className="underline">
        Open editor
      </Link>
    </div>
  );
}
