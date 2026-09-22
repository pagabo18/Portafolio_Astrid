import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { createCategory, listCategories } from "@/lib/data/photos";
import { slugify } from "@/lib/ids";

export const GET = admin(async () => listCategories());

export const POST = admin(async (req) => {
  const { name } = await body(req, z.object({ name: z.string().min(1).max(80) }));
  return createCategory(name.trim(), slugify(name));
});
