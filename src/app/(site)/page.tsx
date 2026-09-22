import { getPublishedPage } from "@/lib/data/pages";
import { buildRenderData } from "@/lib/data/render";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";

export default async function HomePage() {
  const page = await getPublishedPage("home");
  if (!page) return null;
  const data = await buildRenderData(page.document);
  return <EditorialRoot document={page.document} data={data} />;
}
