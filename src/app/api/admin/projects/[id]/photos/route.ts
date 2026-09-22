import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { addPhotosToProject, getProjectPhotoIds, removePhotosFromProject, setProjectPhotos } from "@/lib/data/projects";
import { getPhotoMap } from "@/lib/data/photos";

const ids = z.object({ photoIds: z.array(z.string()) });

export const GET = admin<{ id: string }>(async (_req, { params }) => {
  const photoIds = await getProjectPhotoIds(params.id);
  return { photoIds, photos: await getPhotoMap(photoIds) };
});
export const PUT = admin<{ id: string }>(async (req, { params }) => {
  const { photoIds } = await body(req, ids);
  await setProjectPhotos(params.id, photoIds);
  return { photoIds };
});
export const POST = admin<{ id: string }>(async (req, { params }) => {
  const { photoIds } = await body(req, ids);
  await addPhotosToProject(params.id, photoIds);
  const all = await getProjectPhotoIds(params.id);
  return { photoIds: all, photos: await getPhotoMap(all) };
});
export const DELETE = admin<{ id: string }>(async (req, { params }) => {
  const { photoIds } = await body(req, ids);
  await removePhotosFromProject(params.id, photoIds);
  return { photoIds: await getProjectPhotoIds(params.id) };
});
