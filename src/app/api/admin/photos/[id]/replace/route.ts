import { admin } from "@/lib/api/handler";
import { replacePhotoFile } from "@/lib/data/photos";

/** multipart/form-data: file — keeps every placement, caption and setting. */
export const POST = admin<{ id: string }>(async (req, { params }) => {
  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File)) return new Response(JSON.stringify({ error: "No file" }), { status: 400 });
  return replacePhotoFile(params.id, { name: f.name, data: Buffer.from(await f.arrayBuffer()) });
});
