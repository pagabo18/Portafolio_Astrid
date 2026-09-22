import { getSiteSettings } from "@/lib/data/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSiteSettings();
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="mb-8">
        <div className="eyebrow">Settings</div>
        <h1 className="mt-1 text-2xl font-light">Site settings</h1>
      </div>
      <SettingsForm initial={settings} storageDriver={process.env.STORAGE_DRIVER ?? "local"} database={process.env.DATABASE_URL ? "postgres" : "pglite (local file)"} />
    </div>
  );
}
