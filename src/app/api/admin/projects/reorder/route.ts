import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { reorderProjects } from "@/lib/data/projects";

export const PUT = admin(async (req) => {
  const { ids } = await body(req, z.object({ ids: z.array(z.string()) }));
  await reorderProjects(ids);
  return { ok: true };
});
