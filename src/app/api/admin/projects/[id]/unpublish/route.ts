import { revalidatePath } from "next/cache";
import { admin } from "@/lib/api/handler";
import { unpublishProject } from "@/lib/data/projects";

export const POST = admin<{ id: string }>(async (_req, { params }) => {
  const p = await unpublishProject(params.id);
  revalidatePath("/", "layout");
  return { status: p?.status };
});
