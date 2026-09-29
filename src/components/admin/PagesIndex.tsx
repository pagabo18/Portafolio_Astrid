"use client";

import Link from "next/link";
import { pageHasUnpublished, useAdminState } from "@/lib/content/admin";
import { PAGE_SLUGS } from "@/lib/content/types";
import { timeAgo } from "@/lib/client/api";
import { useT } from "@/lib/i18n/useT";

const DESC: Record<string, string> = {
  home: "What visitors see first: hero, selected projects, texts.",
  archive: "Filterable grid of every photograph marked “Show in archive”.",
  about: "Biography, contact and any editorial text.",
};

export function PagesIndex() {
  const t = useT();
  const pages = useAdminState((s) => s.pages);
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8">
        <div className="eyebrow">{t("Pages")}</div>
        <h1 className="mt-1 text-2xl font-light">{t("Static pages")}</h1>
      </div>
      <ul className="ui-card divide-y divide-neutral-100">
        {PAGE_SLUGS.map((slug) => {
          const p = pages[slug];
          return (
            <li key={slug}>
              <Link href={`/admin/editor/?type=page&id=${slug}`} className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50">
                <div>
                  <div className="text-[14px]">{t(p.draft.meta.title)}</div>
                  <div className="text-[11.5px] text-neutral-500">{t(DESC[slug])}</div>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  {pageHasUnpublished(p) ? <span className="text-amber-700">{t("Unpublished changes")}</span> : <span className="text-emerald-700">{t("Published")}</span>}
                  <span className="text-neutral-400">{timeAgo(p.draft.draftUpdatedAt)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
