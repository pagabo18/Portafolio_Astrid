import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { createProject, listProjectsAdmin } from "@/lib/data/projects";

export const GET = admin(async () => listProjectsAdmin());

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  year: z.string().max(12).optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  categoryId: z.string().nullable().optional(),
  photoIds: z.array(z.string()).optional(),
  autoLayout: z.boolean().optional(),
});

export const POST = admin(async (req) => {
  const input = await body(req, createProjectSchema);
  return createProject(input);
});
