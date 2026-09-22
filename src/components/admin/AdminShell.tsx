"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth/session";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/pages/home", label: "Home", sub: true },
  { href: "/admin/pages/archive", label: "Archive", sub: true },
  { href: "/admin/pages/about", label: "About", sub: true },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ user, unpublished, children }: { user: AuthUser; unpublished: number; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isEditor = /^\/admin\/(projects\/[^/]+|pages\/[^/]+)$/.test(path) && !path.endsWith("/projects") && !path.endsWith("/pages");

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (isEditor) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-neutral-200 bg-white px-5 py-6">
        <Link href="/admin" className="eyebrow text-neutral-900">
          Portfolio admin
        </Link>
        <nav className="mt-8 flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = path === n.href || (n.href !== "/admin/pages" && path.startsWith(n.href + "/"));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-sm px-2 py-1.5 text-[13px] transition ${n.sub ? "ml-3 text-neutral-500" : "text-neutral-800"} ${active ? "bg-neutral-100 text-neutral-900" : "hover:bg-neutral-50"}`}
              >
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
          <a href="/" target="_blank" rel="noreferrer" className="text-neutral-800 hover:underline">
            View website ↗
          </a>
          <span className="truncate text-neutral-400" title={user.email}>
            {user.email}
          </span>
          <button onClick={logout} className="text-left text-neutral-500 hover:text-neutral-900">
            Log out
          </button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
