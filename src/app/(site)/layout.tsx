import { loadSite } from "@/lib/content/server";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { EditModeBar } from "@/components/public/EditModeBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = loadSite();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader settings={settings} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
      <EditModeBar />
    </div>
  );
}
