import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublishedProject, listPublishedProjects } from "@/lib/data/projects";
import { buildRenderData } from "@/lib/data/render";
import { getPhoto } from "@/lib/data/photos";
import { getSiteSettings } from "@/lib/data/settings";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import { fallbackUrl } from "@/lib/photos/view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublishedProject(slug);
  if (!p) return {};
  const s = await getSiteSettings();
  const og = p.meta.ogPhotoId || p.meta.coverPhotoId;
  const ogPhoto = og ? await getPhoto(og) : null;
  return {
    title: p.meta.seoTitle || p.meta.name,
    description: p.meta.seoDescription || p.meta.description || `${p.meta.name} — ${s.siteName}`,
    openGraph: ogPhoto ? { images: [{ url: fallbackUrl(ogPhoto), width: ogPhoto.width, height: ogPhoto.height }] } : undefined,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const all = await listPublishedProjects();
  const idx = all.findIndex((p) => p.slug === slug);
  const p = all[idx];
  if (!p) notFound();
  const next = all[(idx + 1) % all.length];
  const data = await buildRenderData(p.document);
  data.project = { name: p.meta.name, year: p.meta.year, location: p.meta.location, description: p.meta.description, categoryName: p.categoryName, index: idx + 1 };
  return (
    <>
      <EditorialRoot document={p.document} data={data} />
      {next && next.id !== p.id ? (
        <div className="mt-24 border-t hairline px-[var(--margin)] py-10">
          <Link href={`/projects/${next.slug}`} className="group flex items-baseline justify-between">
            <span className="eyebrow">Next project</span>
            <span className="text-[clamp(18px,2vw,30px)] font-light transition group-hover:opacity-60">{next.meta.name} →</span>
          </Link>
        </div>
      ) : null}
    </>
  );
}
