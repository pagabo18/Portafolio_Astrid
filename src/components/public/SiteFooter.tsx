import type { SiteSettings } from "@/lib/data/settings";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 flex flex-wrap items-baseline justify-between gap-4 border-t hairline px-[var(--margin)] py-6 eyebrow">
      <span>{settings.footerText || `${settings.authorName || settings.siteName} © ${year}`}</span>
      <span className="flex gap-6">
        {settings.instagram ? (
          <a href={settings.instagram.startsWith("http") ? settings.instagram : `https://instagram.com/${settings.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="hover:text-ink">
            Instagram
          </a>
        ) : null}
        {settings.email ? (
          <a href={`mailto:${settings.email}`} className="hover:text-ink">
            Email
          </a>
        ) : null}
      </span>
    </footer>
  );
}
