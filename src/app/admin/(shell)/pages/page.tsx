import Link from "next/link";
import { listPages } from "@/lib/data/pages";
import { timeAgo } from "@/lib/client/api";

export const metadata = { title: "Pages" };

export default async function PagesIndex() {
  const pages = await listPages();
  const desc: Record<string, string> = {
    home: "What visitors see first: hero, selected projects, texts.",
    archive: "Filterable grid of every photograph marked “Show in archive”.",
    about: "Biography, contact and any editorial text.",
  };
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8">
        <div className="eyebrow">Pages</div>
        <h1 className="mt-1 text-2xl font-light">Static pages</h1>
      </div>
      <ul className="ui-card divide-y divide-neutral-100">
        {pages.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/pages/${p.slug}`} className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50">
              <div>
                <div className="text-[14px]">{p.title}</div>
                <div className="text-[11.5px] text-neutral-500">{desc[p.slug]}</div>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                {p.hasUnpublished ? <span className="text-amber-700">Unpublished changes</span> : <span className="text-emerald-700">Published</span>}
                <span className="text-neutral-400">{timeAgo(p.updatedAt)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
