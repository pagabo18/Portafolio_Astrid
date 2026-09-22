import type { Metadata } from "next";
import "./globals.css";
import { loadSite } from "@/lib/content/server";

export async function generateMetadata(): Promise<Metadata> {
  const s = loadSite();
  return {
    title: { default: s.seoTitle || s.siteName, template: `%s — ${s.siteName}` },
    description: s.seoDescription || s.tagline,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const s = loadSite();
  return (
    <html lang="en" data-theme={s.theme}>
      <body>{children}</body>
    </html>
  );
}
