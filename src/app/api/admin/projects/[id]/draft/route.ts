import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { saveProjectDraft, hasUnpublishedChanges } from "@/lib/data/projects";

export const PUT = admin<{ id: string }>(async (req, { params }) => {
  const { document } = await body(req, z.object({ document: z.unknown() }));
  const p = await saveProjectDraft(params.id, document);
  return { draftUpdatedAt: p.draftUpdatedAt, hasUnpublished: hasUnpublishedChanges(p), document: p.draft };
});
