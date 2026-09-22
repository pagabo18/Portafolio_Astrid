import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { z } from "zod";

export const siteSettingsSchema = z.object({
  siteName: z.string().default("Portfolio"),
  tagline: z.string().default("Photography"),
  authorName: z.string().default(""),
  email: z.string().default(""),
  instagram: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  footerText: z.string().default(""),
  /** Which nav items to show */
  nav: z.array(z.object({ label: z.string(), href: z.string() })).default([
    { label: "Work", href: "/" },
    { label: "Archive", href: "/archive" },
    { label: "About", href: "/about" },
  ]),
  showIndexNumbers: z.boolean().default(true),
  theme: z.enum(["paper", "white"]).default("paper"),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, "site"));
  const parsed = siteSettingsSchema.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : siteSettingsSchema.parse({});
}

export async function saveSiteSettings(value: unknown) {
  const db = await getDb();
  const parsed = siteSettingsSchema.parse({ ...(await getSiteSettings()), ...(value as object) });
  await db
    .insert(schema.settings)
    .values({ key: "site", value: parsed, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: parsed, updatedAt: new Date() } });
  return parsed;
}
