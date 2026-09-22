import { notFound } from "next/navigation";
import { getPage, PAGE_SLUGS } from "@/lib/data/pages";
import { hasUnpublishedChanges, listPublishedProjects } from "@/lib/data/projects";
import { getPhotoMap, listCategories, listPhotos, photoYears } from "@/lib/data/photos";
import { collectPhotoIds } from "@/lib/blocks/schema";
import { toCard } from "@/lib/data/render";
import { Editor } from "@/components/editor/Editor";

export const metadata = { title: "Edit page" };

export default async function PageEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(PAGE_SLUGS as readonly string[]).includes(slug)) notFound();
  const p = await getPage(slug);
  if (!p) notFound();
  const [categories, projects, years] = await Promise.all([listCategories(), listPublishedProjects({ home: true }), photoYears()]);
  const cards = projects.map(toCard);
  const archive = slug === "archive" ? (await listPhotos({ hidden: "visible", sort: "archive" })) : [];
  const photos = await getPhotoMap([...collectPhotoIds(p.draft), ...cards.map((c) => c.coverPhotoId ?? ""), p.ogPhotoId ?? ""].filter(Boolean));
  return (
    <Editor
      target={{
        type: "page",
        id: p.id,
        slug: p.slug,
        name: p.title,
        status: "published",
        previewToken: p.previewToken,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        hasUnpublished: hasUnpublishedChanges({ ...p, status: "published" }),
        meta: { title: p.title, seoTitle: p.seoTitle, seoDescription: p.seoDescription, ogPhotoId: p.ogPhotoId },
      }}
      document={p.draft}
      photos={photos}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      projects={cards}
      archivePhotos={archive}
      years={years}
    />
  );
}
