"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { TOKEN_KEY } from "@/lib/content/admin";

const subscribeNoop = () => () => {};
function hasSession() {
  try {
    return !!localStorage.getItem(TOKEN_KEY) || !!process.env.NEXT_PUBLIC_GITHUB_API;
  } catch {
    return false;
  }
}

/** Shown only when this browser holds an admin session (GitHub token). */
export function EditModeBar() {
  const path = usePathname();
  const admin = useSyncExternalStore(subscribeNoop, hasSession, () => false);
  if (!admin || path.startsWith("/preview")) return null;

  let href = "/admin";
  let label = "Edit";
  if (path === "/") {
    href = "/admin/editor?type=page&id=home";
    label = "Edit home";
  } else if (path.startsWith("/projects/")) {
    href = `/admin/projects?slug=${path.split("/")[2]}`;
    label = "Edit project";
  } else if (path.startsWith("/archive")) {
    href = "/admin/editor?type=page&id=archive";
    label = "Edit archive";
  } else if (path.startsWith("/about")) {
    href = "/admin/editor?type=page&id=about";
    label = "Edit about";
  }
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-neutral-900 px-1.5 py-1.5 text-[11px] text-white shadow-lg">
      <Link href="/admin" className="rounded-full px-3 py-1 hover:bg-white/10">Admin</Link>
      <Link href={href} className="rounded-full bg-white px-3 py-1 text-neutral-900">{label} ↗</Link>
    </div>
  );
}
