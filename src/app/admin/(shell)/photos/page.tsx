import { listPhotos, listCategories, photoYears } from "@/lib/data/photos";
import { listProjectsAdmin } from "@/lib/data/projects";
import { PhotoLibrary } from "@/components/admin/PhotoLibrary";

export const metadata = { title: "Photos" };

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ upload?: string }> }) {
  const { upload } = await searchParams;
  const [photos, categories, projects, years] = await Promise.all([listPhotos(), listCategories(), listProjectsAdmin(), photoYears()]);
  return (
    <PhotoLibrary
      initial={photos}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      years={years}
      openUpload={upload === "1"}
    />
  );
}
