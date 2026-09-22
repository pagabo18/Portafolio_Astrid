import type { Metadata } from "next";
import { getPublishedPage } from "@/lib/data/pages";
import { buildRenderData } from "@/lib/data/render";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";

export const metadata: Metadata = { title: "Archive" };

export default async function ArchivePage() {
  const page = await getPublishedPage("archive");
  if (!page) return null;
  const data = await buildRenderData(page.document);
  return <EditorialRoot document={page.document} data={data} />;
}
