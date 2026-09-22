import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { getPageById, updatePageMeta } from "@/lib/data/pages";

export const GET = admin<{ id: string }>(async (_req, { params }) => {
  const p = await getPageById(params.id);
  if (!p) throw new Error("Page not found");
  return p;
});

export const PATCH = admin<{ id: string }>(async (req, { params }) => {
  const patch = await body(
    req,
    z.object({
      title: z.string().min(1).max(200).optional(),
      seoTitle: z.string().max(200).optional(),
      seoDescription: z.string().max(500).optional(),
      ogPhotoId: z.string().nullable().optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
    }),
  );
  return updatePageMeta(params.id, patch);
});
