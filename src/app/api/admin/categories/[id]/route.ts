import { admin } from "@/lib/api/handler";
import { deleteCategory } from "@/lib/data/photos";

export const DELETE = admin<{ id: string }>(async (_req, { params }) => {
  await deleteCategory(params.id);
  return { ok: true };
});
