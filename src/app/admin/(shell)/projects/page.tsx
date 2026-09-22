import { listProjectsAdmin } from "@/lib/data/projects";
import { getPhotoMap, listCategories } from "@/lib/data/photos";
import { ProjectsList } from "@/components/admin/ProjectsList";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: openNew } = await searchParams;
  const [projects, categories] = await Promise.all([listProjectsAdmin(), listCategories()]);
  const covers = await getPhotoMap(projects.map((p) => p.coverPhotoId).filter((x): x is string => !!x));
  return (
    <ProjectsList
      initial={projects.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        year: p.year,
        location: p.location,
        status: p.status,
        featured: p.featured,
        showOnHome: p.showOnHome,
        showInArchive: p.showInArchive,
        photoCount: p.photoCount,
        hasUnpublished: p.hasUnpublished,
        coverUrl: p.coverPhotoId ? covers[p.coverPhotoId]?.thumbUrl ?? null : null,
        updatedAt: p.updatedAt.toISOString(),
        previewToken: p.previewToken,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      openNew={openNew === "1"}
    />
  );
}
