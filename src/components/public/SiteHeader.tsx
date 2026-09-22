"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteSettings } from "@/lib/data/settings";

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const path = usePathname();
  return (
    <header className="flex items-baseline justify-between px-[var(--margin)] pt-6 pb-2 eyebrow">
      <Link href="/" className="text-ink">
        {settings.siteName}
      </Link>
      <nav className="flex gap-6">
        {settings.nav.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={active ? "text-ink" : "hover:text-ink"}>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
