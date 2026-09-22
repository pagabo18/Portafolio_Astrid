import { getSiteSettings } from "@/lib/data/settings";
import { getCurrentUser } from "@/lib/auth/session";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { EditModeBar } from "@/components/public/EditModeBar";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSiteSettings(), getCurrentUser()]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader settings={settings} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      {user ? <EditModeBar /> : null}
    </div>
  );
}
