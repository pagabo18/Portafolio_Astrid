import type { Metadata } from "next";
import { buildRenderData, loadPage } from "@/lib/content/server";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const page = loadPage("about");
  if (!page) return null;
  return <EditorialRoot document={page.document} data={buildRenderData(page.document)} />;
}
