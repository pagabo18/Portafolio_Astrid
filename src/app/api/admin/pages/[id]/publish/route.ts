import { revalidatePath } from "next/cache";
import { admin } from "@/lib/api/handler";
import { publishPage } from "@/lib/data/pages";

export const POST = admin<{ id: string }>(async (_req, { params }) => {
  const p = await publishPage(params.id);
  revalidatePath("/", "layout");
  return { publishedAt: p?.publishedAt, hasUnpublished: false, status: "published" };
});
