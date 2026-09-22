"use client";

import Link from "next/link";
import { pageHasUnpublished, projectHasUnpublished, useAdminState } from "@/lib/content/admin";
import { PAGE_SLUGS } from "@/lib/content/types";
import { timeAgo } from "@/lib/client/api";
import { repoFromEnv } from "@/lib/github/client";

export function Dashboard() {
  const projects = useAdminState((s) => s.projects);
  const photos = useAdminState((s) => s.photos);
  const pages = useAdminState((s) => s.pages);
  const env = repoFromEnv();
  const pending = [
    ...projects.filter((p) => p.file.status !== "archived" && projectHasUnpublished(p)).map((p) => ({ href: `/admin/editor?type=project&id=${p.file.id}`, name: p.draft.meta.name, kind: p.file.status === "published" ? "Project · unpublished changes" : "Project · draft", at: p.draft.draftUpdatedAt })),
    ...PAGE_SLUGS.filter((s) => pageHasUnpublished(pages[s])).map((s) => ({ href: `/admin/editor?type=page&id=${s}`, name: pages[s].draft.meta.title, kind: "Page · unpublished changes", at: pages[s].draft.draftUpdatedAt })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const stats = [
    { label: "Projects", value: projects.length, sub: `${projects.filter((p) => p.file.status === "published").length} published`, href: "/admin/projects" },
    { label: "Photos", value: photos.length, sub: `${photos.filter((p) => p.hidden).length} hidden`, href: "/admin/photos" },
    { label: "Pages", value: PAGE_SLUGS.length, sub: "home · archive · about", href: "/admin/pages" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1 className="mt-1 text-2xl font-light">Portfolio admin</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/photos?upload=1" className="ui-btn">Upload photos</Link>
          <Link href="/admin/projects?new=1" className="ui-btn ui-btn-primary">+ New project</Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="ui-card p-5 transition hover:border-neutral-400">
            <div className="eyebrow">{s.label}</div>
            <div className="mt-2 text-3xl font-light">{s.value}</div>
            <div className="mt-1 text-[12px] text-neutral-500">{s.sub}</div>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="eyebrow">Unpublished changes</h2>
          {pending.length ? <span className="text-[11px] text-amber-700">{pending.length} waiting</span> : null}
        </div>
        {pending.length ? (
          <ul className="ui-card divide-y divide-neutral-100">
            {pending.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                  <div>
                    <div className="text-[13px]">{p.name}</div>
                    <div className="text-[11px] text-neutral-500">{p.kind}</div>
                  </div>
                  <span className="text-[11px] text-neutral-400">{timeAgo(p.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ui-card px-4 py-6 text-center text-[12px] text-neutral-500">Everything is published.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="eyebrow mb-3">Recent projects</h2>
        <ul className="ui-card divide-y divide-neutral-100">
          {projects.slice(0, 6).map((p) => (
            <li key={p.file.id}>
              <Link href={`/admin/editor?type=project&id=${p.file.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                <div className="flex items-center gap-3">
                  <span className="text-[13px]">{p.draft.meta.name}</span>
                  <span className="text-[11px] text-neutral-400">{[p.draft.meta.year, p.draft.meta.location].filter(Boolean).join(" · ")}</span>
                </div>
                <span className={`text-[10.5px] uppercase tracking-wider ${p.file.status === "published" ? "text-emerald-700" : "text-neutral-400"}`}>{p.file.status}</span>
              </Link>
            </li>
          ))}
          {!projects.length ? <li className="px-4 py-6 text-center text-[12px] text-neutral-500">No projects yet.</li> : null}
        </ul>
      </section>

      <p className="mt-12 text-[11px] text-neutral-400">
        Every save is a commit in <span className="text-neutral-600">{env.owner}/{env.repo}</span>. Publishing triggers the GitHub Actions build; the live site updates a couple of minutes later.
      </p>
    </div>
  );
}
