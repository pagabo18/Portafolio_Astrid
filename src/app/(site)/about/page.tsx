import type { Metadata } from "next";
import { getPublishedPage } from "@/lib/data/pages";
import { buildRenderData } from "@/lib/data/render";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const page = await getPublishedPage("about");
  if (!page) return null;
  const data = await buildRenderData(page.document);
  return <EditorialRoot document={page.document} data={data} />;
}
