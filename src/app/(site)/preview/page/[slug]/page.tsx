import { notFound } from "next/navigation";
import { getPage } from "@/lib/data/pages";
import { buildRenderData } from "@/lib/data/render";
import { getCurrentUser } from "@/lib/auth/session";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import { PreviewBanner } from "@/components/public/PreviewBanner";

export const metadata = { robots: { index: false, follow: false } };

export default async function PagePreview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { slug } = await params;
  const { token } = await searchParams;
  const p = await getPage(slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  if (!user && token !== p.previewToken) notFound();
  const data = await buildRenderData(p.draft, { projectHrefBase: "/preview/project" });
  return (
    <>
      <PreviewBanner label={`Draft preview — ${p.title}`} editHref={`/admin/pages/${p.slug}`} />
      <EditorialRoot document={p.draft} data={data} />
    </>
  );
}
