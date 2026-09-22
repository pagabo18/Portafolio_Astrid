"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Shown only to a logged-in admin browsing the public site. */
export function EditModeBar() {
  const path = usePathname();
  let href = "/admin";
  let label = "Edit";
  if (path === "/") {
    href = "/admin/pages/home";
    label = "Edit home";
  } else if (path.startsWith("/projects/")) {
    href = `/admin/projects/by-slug/${path.split("/")[2]}`;
    label = "Edit project";
  } else if (path.startsWith("/archive")) {
    href = "/admin/pages/archive";
    label = "Edit archive";
  } else if (path.startsWith("/about")) {
    href = "/admin/pages/about";
    label = "Edit about";
  }
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-neutral-900 px-1.5 py-1.5 text-[11px] text-white shadow-lg">
      <Link href="/admin" className="rounded-full px-3 py-1 hover:bg-white/10">
        Admin
      </Link>
      <Link href={href} className="rounded-full bg-white px-3 py-1 text-neutral-900">
        {label} ↗
      </Link>
    </div>
  );
}
