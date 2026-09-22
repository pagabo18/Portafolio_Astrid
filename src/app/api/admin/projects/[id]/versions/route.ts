import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { addVersion, getProject, listVersions } from "@/lib/data/projects";

export const GET = admin<{ id: string }>(async (_req, { params }) => listVersions("project", params.id));

/** Manual snapshot of the current draft. */
export const POST = admin<{ id: string }>(async (req, { params }) => {
  const { label } = await body(req, z.object({ label: z.string().max(120).optional() }));
  const p = await getProject(params.id);
  if (!p) throw new Error("Project not found");
  await addVersion("project", p.id, "snapshot", label ?? "Snapshot", p.draft);
  return listVersions("project", p.id);
});
