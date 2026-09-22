import { notFound } from "next/navigation";
import { getProject, getProjectPhotoIds, hasUnpublishedChanges, listProjectsAdmin } from "@/lib/data/projects";
import { getPhotoMap, listCategories } from "@/lib/data/photos";
import { collectPhotoIds } from "@/lib/blocks/schema";
import { Editor } from "@/components/editor/Editor";

export const metadata = { title: "Edit project" };

export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) notFound();
  const [photoIds, categories, all] = await Promise.all([getProjectPhotoIds(p.id), listCategories(), listProjectsAdmin()]);
  const photos = await getPhotoMap([...photoIds, ...collectPhotoIds(p.draft), p.coverPhotoId ?? "", p.ogPhotoId ?? ""].filter(Boolean));
  const index = all.findIndex((x) => x.id === p.id) + 1;
  return (
    <Editor
      target={{
        type: "project",
        id: p.id,
        slug: p.slug,
        name: p.name,
        status: p.status,
        previewToken: p.previewToken,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        hasUnpublished: hasUnpublishedChanges(p),
        meta: {
          name: p.name,
          slug: p.slug,
          year: p.year,
          location: p.location,
          description: p.description,
          coverPhotoId: p.coverPhotoId,
          categoryId: p.categoryId,
          featured: p.featured,
          showOnHome: p.showOnHome,
          showInArchive: p.showInArchive,
          seoTitle: p.seoTitle,
          seoDescription: p.seoDescription,
          ogPhotoId: p.ogPhotoId,
        },
        photoIds,
        index,
      }}
      document={p.draft}
      photos={photos}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
