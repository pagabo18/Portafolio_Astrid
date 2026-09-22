import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { addVersion, listVersions } from "@/lib/data/projects";
import { getPageById } from "@/lib/data/pages";

export const GET = admin<{ id: string }>(async (_req, { params }) => listVersions("page", params.id));

export const POST = admin<{ id: string }>(async (req, { params }) => {
  const { label } = await body(req, z.object({ label: z.string().max(120).optional() }));
  const p = await getPageById(params.id);
  if (!p) throw new Error("Page not found");
  await addVersion("page", p.id, "snapshot", label ?? "Snapshot", p.draft);
  return listVersions("page", p.id);
});
