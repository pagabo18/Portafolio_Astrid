import { admin } from "@/lib/api/handler";
import { duplicateProject } from "@/lib/data/projects";

export const POST = admin<{ id: string }>(async (_req, { params }) => duplicateProject(params.id));
