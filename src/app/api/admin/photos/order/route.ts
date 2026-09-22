import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { setArchiveOrder } from "@/lib/data/photos";

/** Archive order for the photo archive grid. */
export const PUT = admin(async (req) => {
  const { ids } = await body(req, z.object({ ids: z.array(z.string()) }));
  await setArchiveOrder(ids);
  return { ok: true };
});
