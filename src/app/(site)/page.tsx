import { buildRenderData, loadPage } from "@/lib/content/server";
import { EditorialRoot } from "@/components/editorial/EditorialRoot";

export default function HomePage() {
  const page = loadPage("home");
  if (!page) return null;
  return <EditorialRoot document={page.document} data={buildRenderData(page.document)} />;
}
