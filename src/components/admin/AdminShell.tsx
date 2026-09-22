"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { pageHasUnpublished, projectHasUnpublished, signOut, useAdminState } from "@/lib/content/admin";
import { withBase } from "@/lib/content/paths";
import { PAGE_SLUGS } from "@/lib/content/types";

const NAV = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/editor?type=page&id=home", label: "Home", sub: true, match: "home" },
  { href: "/admin/editor?type=page&id=archive", label: "Archive", sub: true, match: "archive" },
  { href: "/admin/editor?type=page&id=about", label: "About", sub: true, match: "about" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const login = useAdminState((s) => s.login);
  const busy = useAdminState((s) => s.busy);
  const projects = useAdminState((s) => s.projects);
  const pages = useAdminState((s) => s.pages);
  const unpublished = projects.filter((p) => p.file.status !== "archived" && projectHasUnpublished(p)).length + PAGE_SLUGS.filter((s) => pageHasUnpublished(pages[s])).length;

  if (path.startsWith("/admin/editor")) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-neutral-200 bg-white px-5 py-6">
        <Link href="/admin" className="eyebrow text-neutral-900">Portfolio admin</Link>
        <nav className="mt-8 flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = n.match ? false : path === n.href || path.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} className={`rounded-sm px-2 py-1.5 text-[13px] transition ${n.sub ? "ml-3 text-neutral-500" : "text-neutral-800"} ${active ? "bg-neutral-100 text-neutral-900" : "hover:bg-neutral-50"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        {unpublished > 0 ? (
          <Link href="/admin" className="mt-6 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900">
            <span className="font-medium">Unpublished changes</span>
            <br />
            {unpublished} item{unpublished > 1 ? "s" : ""} waiting
          </Link>
        ) : null}
        <div className="mt-auto flex flex-col gap-2 text-[12px]">
          {busy ? <span className="text-[11px] text-neutral-400">⟳ {busy}</span> : null}
          <a href={withBase("/")} target="_blank" rel="noreferrer" className="text-neutral-800 hover:underline">View website ↗</a>
          <span className="truncate text-neutral-400" title={login}>{login}</span>
          <button onClick={signOut} className="text-left text-neutral-500 hover:text-neutral-900">Log out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
