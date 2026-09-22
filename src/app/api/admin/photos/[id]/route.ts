import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { deletePhotos, getPhoto, updatePhoto } from "@/lib/data/photos";

export const photoPatchSchema = z.object({
  title: z.string().max(300).optional(),
  description: z.string().max(4000).optional(),
  alt: z.string().max(600).optional(),
  year: z.string().max(12).optional(),
  location: z.string().max(200).optional(),
  camera: z.string().max(200).optional(),
  lens: z.string().max(200).optional(),
  categoryId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  hidden: z.boolean().optional(),
  featured: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
  showInArchive: z.boolean().optional(),
  archiveOrder: z.number().int().optional(),
  focalX: z.number().min(0).max(1).optional(),
  focalY: z.number().min(0).max(1).optional(),
});

export const GET = admin<{ id: string }>(async (_req, { params }) => {
  const p = await getPhoto(params.id);
  if (!p) throw new Error("Photo not found");
  return p;
});

export const PATCH = admin<{ id: string }>(async (req, { params }) => {
  const patch = await body(req, photoPatchSchema);
  return updatePhoto(params.id, patch);
});

export const DELETE = admin<{ id: string }>(async (_req, { params }) => {
  await deletePhotos([params.id]);
  return { ok: true };
});
