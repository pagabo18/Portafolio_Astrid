import { revalidatePath } from "next/cache";
import { admin } from "@/lib/api/handler";
import { getSiteSettings, saveSiteSettings } from "@/lib/data/settings";

export const GET = admin(async () => getSiteSettings());
export const PUT = admin(async (req) => {
  const s = await saveSiteSettings(await req.json());
  revalidatePath("/", "layout");
  return s;
});
