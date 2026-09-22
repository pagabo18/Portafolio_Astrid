import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { savePageDraft } from "@/lib/data/pages";
import { hasUnpublishedChanges } from "@/lib/data/projects";

export const PUT = admin<{ id: string }>(async (req, { params }) => {
  const { document } = await body(req, z.object({ document: z.unknown() }));
  const p = await savePageDraft(params.id, document);
  return { draftUpdatedAt: p.draftUpdatedAt, hasUnpublished: hasUnpublishedChanges({ ...p, status: "published" }), document: p.draft };
});
