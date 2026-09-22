import { admin } from "@/lib/api/handler";
import { getVersion } from "@/lib/data/projects";

/** Returns the stored document; the editor loads it as an undoable change. */
export const GET = admin<{ vid: string }>(async (_req, { params }) => {
  const v = await getVersion(params.vid);
  if (!v) throw new Error("Version not found");
  return v;
});
