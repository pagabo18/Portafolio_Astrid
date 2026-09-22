import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/data/settings";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: { default: s.seoTitle || s.siteName, template: `%s — ${s.siteName}` },
    description: s.seoDescription || s.tagline,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSiteSettings();
  return (
    <html lang="en" data-theme={s.theme}>
      <body>{children}</body>
    </html>
  );
}
