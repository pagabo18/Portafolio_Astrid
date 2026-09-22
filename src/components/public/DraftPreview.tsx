"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdminProvider } from "@/components/admin/AdminProvider";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import { useAdminState, views, viewMap } from "@/lib/content/admin";
import { collectPhotoIds } from "@/lib/blocks/schema";
import { PAGE_SLUGS, type PageSlug } from "@/lib/content/types";
import type { ProjectCard } from "@/components/editorial/types";

/**
 * /preview?type=project&id=…  — renders the DRAFT with the admin's session.
 * Drafts are never part of the published site.
 */
export function DraftPreview() {
  return (
    <div className="admin-preview">
      <AdminProvider bare>
        <Body />
      </AdminProvider>
    </div>
  );
}

function Body() {
  const params = useSearchParams();
  const type = params.get("type");
  const id = params.get("id") ?? "";
  const projects = useAdminState((s) => s.projects);
  const pages = useAdminState((s) => s.pages);
  const records = useAdminState((s) => s.photos);
  const categories = useAdminState((s) => s.categories);

  const banner = (label: string, editHref: string) => (
    <div className="sticky top-0 z-40 flex items-center justify-between bg-amber-100 px-[var(--margin)] py-2 text-[11px] tracking-wider uppercase text-amber-900">
      <span>{label}</span>
      <Link href={editHref} className="underline">Open editor</Link>
    </div>
  );

  if (type === "project") {
    const p = projects.find((x) => x.file.id === id);
    if (!p) return <p className="p-10 text-[12px]">Project not found.</p>;
    const idx = projects.findIndex((x) => x.file.id === id) + 1;
    const photos = viewMap(collectPhotoIds(p.draft.document));
    for (const k of Object.keys(photos)) if (photos[k].hidden) delete photos[k];
    return (
      <>
        {banner(`Draft preview — ${p.draft.meta.name}`, `/admin/editor?type=project&id=${id}`)}
        <EditorialRoot document={p.draft.document} data={{ photos, project: { ...p.draft.meta, categoryName: categories.find((c) => c.id === p.draft.meta.categoryId)?.name ?? "", index: idx }, projectHrefBase: "/preview?type=project&id=" }} />
      </>
    );
  }
  if (type === "page" && (PAGE_SLUGS as readonly string[]).includes(id)) {
    const p = pages[id as PageSlug];
    const published = projects.filter((x) => x.file.status === "published" && x.file.published && x.file.showOnHome);
    const cards: ProjectCard[] = published.map((x) => ({ id: x.file.id, slug: x.file.slug, name: x.file.published!.meta.name, year: x.file.published!.meta.year, location: x.file.published!.meta.location, categoryName: "", description: x.file.published!.meta.description, coverPhotoId: x.file.published!.meta.coverPhotoId, featured: x.file.featured }));
    const all = views(records).filter((x) => !x.hidden);
    const archive = all.filter((x) => x.showInArchive).sort((a, b) => a.archiveOrder - b.archiveOrder);
    return (
      <>
        {banner(`Draft preview — ${p.draft.meta.title}`, `/admin/editor?type=page&id=${id}`)}
        <EditorialRoot
          document={p.draft.document}
          data={{ photos: viewMap([...collectPhotoIds(p.draft.document), ...cards.map((c) => c.coverPhotoId ?? "")].filter(Boolean)), projects: cards, archivePhotos: archive, categories: categories.map((c) => ({ id: c.id, name: c.name })), years: [...new Set(archive.map((x) => x.year).filter(Boolean))].sort().reverse(), projectHrefBase: "/projects" }}
        />
      </>
    );
  }
  return <p className="p-10 text-[12px]">Nothing to preview.</p>;
}
