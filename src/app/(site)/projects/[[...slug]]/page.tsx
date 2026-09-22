import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildRenderData, loadPhotos, loadPublishedProjects, loadSite } from "@/lib/content/server";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";
import { EditorialImage } from "@/components/editorial/EditorialImage";
import { fallbackUrl } from "@/lib/photos/view";
import { newSlot } from "@/lib/blocks/schema";

type Props = { params: Promise<{ slug?: string[] }> };

export const dynamicParams = false;

/** /projects/ (index) + /projects/<slug>/ for every published project. */
export function generateStaticParams() {
  return [{ slug: [] }, ...loadPublishedProjects().map((p) => ({ slug: [p.slug] }))];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug?.length) return { title: "Projects" };
  const p = loadPublishedProjects().find((x) => x.slug === slug[0]);
  if (!p) return {};
  const s = loadSite();
  const og = p.snapshot.meta.ogPhotoId || p.snapshot.meta.coverPhotoId;
  const ogPhoto = og ? loadPhotos().find((x) => x.id === og) : undefined;
  return {
    title: p.snapshot.meta.seoTitle || p.snapshot.meta.name,
    description: p.snapshot.meta.seoDescription || p.snapshot.meta.description || `${p.snapshot.meta.name} — ${s.siteName}`,
    openGraph: ogPhoto ? { images: [{ url: fallbackUrl(ogPhoto), width: ogPhoto.width, height: ogPhoto.height }] } : undefined,
  };
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const all = loadPublishedProjects();
  if (!slug?.length) return <ProjectsIndex />;
  const idx = all.findIndex((p) => p.slug === slug[0]);
  const p = all[idx];
  if (!p) notFound();
  const next = all[(idx + 1) % all.length];
  const data = buildRenderData(p.snapshot.document);
  data.project = { name: p.snapshot.meta.name, year: p.snapshot.meta.year, location: p.snapshot.meta.location, description: p.snapshot.meta.description, categoryName: p.categoryName, index: idx + 1 };
  return (
    <>
      <EditorialRoot document={p.snapshot.document} data={data} />
      {next && next.id !== p.id ? (
        <div className="mt-24 border-t hairline px-[var(--margin)] py-10">
          <Link href={`/projects/${next.slug}`} className="group flex items-baseline justify-between">
            <span className="eyebrow">Next project</span>
            <span className="text-[clamp(18px,2vw,30px)] font-light transition group-hover:opacity-60">{next.snapshot.meta.name} →</span>
          </Link>
        </div>
      ) : null}
    </>
  );
}

function ProjectsIndex() {
  const all = loadPublishedProjects();
  const photos = loadPhotos();
  return (
    <div className="px-[var(--margin)] py-16">
      <div className="ed-chapter-number mb-4">Index</div>
      <h1 className="ed-title mb-16">Projects</h1>
      {!all.length ? <p className="eyebrow">Nothing published yet.</p> : null}
      <ol className="divide-y hairline border-t border-b">
        {all.map((p, i) => {
          const cover = p.snapshot.meta.coverPhotoId ? photos.find((x) => x.id === p.snapshot.meta.coverPhotoId) : undefined;
          return (
            <li key={p.id}>
              <Link href={`/projects/${p.slug}`} className="group grid grid-cols-12 items-center gap-6 py-6">
                <span className="ed-chapter-number col-span-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="col-span-2 hidden md:block">{cover ? <EditorialImage photo={cover} slot={{ ...newSlot({ span: 2, fit: "cover", aspect: "3:2" }) }} /> : null}</span>
                <span className="col-span-7 text-[clamp(18px,2vw,30px)] font-light transition group-hover:opacity-60">{p.snapshot.meta.name}</span>
                <span className="eyebrow col-span-4 text-right md:col-span-2">{[p.snapshot.meta.year, p.snapshot.meta.location].filter(Boolean).join(" — ")}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
