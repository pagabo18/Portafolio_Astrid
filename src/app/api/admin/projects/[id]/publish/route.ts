import { revalidatePath } from "next/cache";
import { admin } from "@/lib/api/handler";
import { publishProject } from "@/lib/data/projects";

export const POST = admin<{ id: string }>(async (_req, { params }) => {
  const p = await publishProject(params.id);
  revalidatePath("/", "layout");
  return { status: p?.status, publishedAt: p?.publishedAt, hasUnpublished: false, slug: p?.slug };
});
