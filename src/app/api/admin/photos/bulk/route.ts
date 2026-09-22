import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { bulkUpdatePhotos, deletePhotos } from "@/lib/data/photos";
import { addPhotosToProject, removePhotosFromProject } from "@/lib/data/projects";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["hide", "show", "delete", "feature", "unfeature", "home", "unhome", "archive", "unarchive", "category", "project", "add-to-project", "remove-from-project"]),
  value: z.string().nullable().optional(),
});

export const POST = admin(async (req) => {
  const { ids, action, value } = await body(req, schema);
  switch (action) {
    case "hide":
      return bulkUpdatePhotos(ids, { hidden: true });
    case "show":
      return bulkUpdatePhotos(ids, { hidden: false });
    case "feature":
      return bulkUpdatePhotos(ids, { featured: true });
    case "unfeature":
      return bulkUpdatePhotos(ids, { featured: false });
    case "home":
      return bulkUpdatePhotos(ids, { showOnHome: true });
    case "unhome":
      return bulkUpdatePhotos(ids, { showOnHome: false });
    case "archive":
      return bulkUpdatePhotos(ids, { showInArchive: true });
    case "unarchive":
      return bulkUpdatePhotos(ids, { showInArchive: false });
    case "category":
      return bulkUpdatePhotos(ids, { categoryId: value ?? null });
    case "project":
      if (value) await addPhotosToProject(value, ids);
      return bulkUpdatePhotos(ids, { projectId: value ?? null });
    case "add-to-project":
      if (!value) throw new Error("Project required");
      await addPhotosToProject(value, ids);
      return { ok: true };
    case "remove-from-project":
      if (!value) throw new Error("Project required");
      await removePhotosFromProject(value, ids);
      return { ok: true };
    case "delete":
      await deletePhotos(ids);
      return { ok: true };
  }
});
