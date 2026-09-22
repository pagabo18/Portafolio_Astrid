import { admin, query } from "@/lib/api/handler";
import { createPhotoFromUpload, listPhotos } from "@/lib/data/photos";

export const GET = admin(async (req) => {
  const q = query(req);
  const ids = q.get("ids");
  return listPhotos({
    q: q.get("q") ?? undefined,
    categoryId: q.get("categoryId") ?? undefined,
    projectId: q.get("projectId") ?? undefined,
    orientation: q.get("orientation") ?? undefined,
    year: q.get("year") ?? undefined,
    hidden: (q.get("hidden") as "all" | "visible" | "hidden") ?? "all",
    sort: (q.get("sort") as "newest") ?? "newest",
    ids: ids ? ids.split(",").filter(Boolean) : undefined,
  });
});

const MAX_BYTES = 80 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff", "image/heic", "image/heif"];

/** multipart/form-data: files[] (+ projectId, categoryId) */
export const POST = admin(async (req) => {
  const form = await req.formData();
  const projectId = (form.get("projectId") as string) || null;
  const categoryId = (form.get("categoryId") as string) || null;
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return new Response(JSON.stringify({ error: "No files" }), { status: 400 });
  const results = [];
  const errors: { name: string; error: string }[] = [];
  for (const f of files) {
    if (f.size > MAX_BYTES) {
      errors.push({ name: f.name, error: "File larger than 80MB" });
      continue;
    }
    if (f.type && !ALLOWED.includes(f.type)) {
      errors.push({ name: f.name, error: `Unsupported type ${f.type}` });
      continue;
    }
    try {
      const data = Buffer.from(await f.arrayBuffer());
      results.push(await createPhotoFromUpload({ name: f.name, data }, { projectId, categoryId }));
    } catch (e) {
      errors.push({ name: f.name, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  return { photos: results, errors };
});
