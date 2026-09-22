import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { deleteProject, getProject, getProjectPhotoIds, updateProjectMeta, hasUnpublishedChanges } from "@/lib/data/projects";
import { getPhotoMap } from "@/lib/data/photos";

export const projectPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().max(120).optional(),
  year: z.string().max(12).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  coverPhotoId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  featured: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
  showInArchive: z.boolean().optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
  ogPhotoId: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const GET = admin<{ id: string }>(async (_req, { params }) => {
  const p = await getProject(params.id);
  if (!p) throw new Error("Project not found");
  const photoIds = await getProjectPhotoIds(p.id);
  const photos = await getPhotoMap(photoIds);
  return { ...p, photoIds, photos, hasUnpublished: hasUnpublishedChanges(p) };
});

export const PATCH = admin<{ id: string }>(async (req, { params }) => {
  const patch = await body(req, projectPatchSchema);
  const p = await updateProjectMeta(params.id, patch);
  return { ...p, hasUnpublished: hasUnpublishedChanges(p) };
});

export const DELETE = admin<{ id: string }>(async (_req, { params }) => {
  await deleteProject(params.id);
  return { ok: true };
});
