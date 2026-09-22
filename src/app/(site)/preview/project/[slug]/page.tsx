import { notFound } from "next/navigation";
import { getProjectBySlug, listProjectsAdmin } from "@/lib/data/projects";
import { buildRenderData } from "@/lib/data/render";
import { getCurrentUser } from "@/lib/auth/session";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import { PreviewBanner } from "@/components/public/PreviewBanner";

export const metadata = { robots: { index: false, follow: false } };

/** Private preview of the DRAFT: ?token=… (or a logged-in admin). */
export default async function ProjectPreview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { slug } = await params;
  const { token } = await searchParams;
  const p = await getProjectBySlug(slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  if (!user && token !== p.previewToken) notFound();
  const all = await listProjectsAdmin();
  const idx = all.findIndex((x) => x.id === p.id);
  const data = await buildRenderData(p.draft, { includeHidden: false, projectHrefBase: "/preview/project" });
  data.project = { name: p.name, year: p.year, location: p.location, description: p.description, categoryName: "", index: idx + 1 };
  return (
    <>
      <PreviewBanner label={`Draft preview — ${p.name}`} editHref={`/admin/projects/${p.id}`} />
      <EditorialRoot document={p.draft} data={data} />
    </>
  );
}
