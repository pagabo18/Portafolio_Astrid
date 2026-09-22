"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { collectPhotoIds } from "@/lib/blocks/schema";
import { pageHasUnpublished, projectHasUnpublished, useAdminState, viewMap, views } from "@/lib/content/admin";
import { PAGE_SLUGS, type PageSlug } from "@/lib/content/types";
import { photoView } from "@/lib/content/photo-view";
import type { ProjectCard } from "@/components/editorial/types";
import { Editor } from "./Editor";

/** /admin/editor?type=project&id=…  |  ?type=page&id=home */
export function EditorRoute() {
  const params = useSearchParams();
  const type = params.get("type");
  const id = params.get("id") ?? "";
  const projects = useAdminState((s) => s.projects);
  const pages = useAdminState((s) => s.pages);
  const records = useAdminState((s) => s.photos);
  const categories = useAdminState((s) => s.categories);
  const client = useAdminState((s) => s.client);

  const cats = useMemo(() => categories.map((c) => ({ id: c.id, name: c.name })), [categories]);
  // The editor owns its state after mount; a new id remounts it (key below).
  const props = useMemo(() => {
    if (type === "project") {
      const p = projects.find((x) => x.file.id === id);
      if (!p) return null;
      const ids = [...p.file.photoIds, ...collectPhotoIds(p.draft.document), p.draft.meta.coverPhotoId ?? "", p.draft.meta.ogPhotoId ?? ""].filter(Boolean);
      return {
        target: {
          type: "project" as const,
          id: p.file.id,
          slug: p.file.slug,
          name: p.draft.meta.name,
          status: p.file.status,
          previewToken: "",
          publishedAt: p.file.publishedAt,
          hasUnpublished: projectHasUnpublished(p),
          meta: { ...p.draft.meta, featured: p.file.featured, showOnHome: p.file.showOnHome, showInArchive: p.file.showInArchive },
          photoIds: p.file.photoIds,
          index: projects.filter((x) => x.file.status === "published").findIndex((x) => x.file.id === p.file.id) + 1 || projects.findIndex((x) => x.file.id === p.file.id) + 1,
        },
        document: p.draft.document,
        photos: viewMap(ids),
        categories: cats,
      };
    }
    if (type === "page" && (PAGE_SLUGS as readonly string[]).includes(id)) {
      const slug = id as PageSlug;
      const p = pages[slug];
      const published = projects.filter((x) => x.file.status === "published" && x.file.published && x.file.showOnHome);
      const cards: ProjectCard[] = published.map((x) => ({
        id: x.file.id,
        slug: x.file.slug,
        name: x.file.published!.meta.name,
        year: x.file.published!.meta.year,
        location: x.file.published!.meta.location,
        categoryName: categories.find((c) => c.id === x.file.published!.meta.categoryId)?.name ?? "",
        description: x.file.published!.meta.description,
        coverPhotoId: x.file.published!.meta.coverPhotoId,
        featured: x.file.featured,
      }));
      const all = views(records);
      const archive = slug === "archive" ? all.filter((x) => !x.hidden).sort((a, b) => a.archiveOrder - b.archiveOrder) : [];
      const years = [...new Set(archive.map((x) => x.year).filter(Boolean))].sort().reverse();
      return {
        target: { type: "page" as const, id: slug, slug, name: p.draft.meta.title, status: "published" as const, previewToken: "", publishedAt: p.file.publishedAt, hasUnpublished: pageHasUnpublished(p), meta: p.draft.meta },
        document: p.draft.document,
        photos: viewMap([...collectPhotoIds(p.draft.document), ...cards.map((c) => c.coverPhotoId ?? ""), p.draft.meta.ogPhotoId ?? ""].filter(Boolean)),
        categories: cats,
        projects: cards,
        archivePhotos: archive,
        years,
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, client]);

  if (!props) {
    return (
      <div className="p-10 text-[12px] text-neutral-500">
        Nothing to edit here. <Link href="/admin/projects" className="underline">Back to projects</Link>
      </div>
    );
  }
  void photoView;
  return <Editor key={`${type}-${id}`} {...props} />;
}
