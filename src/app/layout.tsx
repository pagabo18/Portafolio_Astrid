import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { collectUsedFonts, loadSite } from "@/lib/content/server";
import { fontStack, googleFontsUrl } from "@/lib/design/fonts";
import { resolveBackground, resolveText } from "@/lib/design/colors";

export async function generateMetadata(): Promise<Metadata> {
  const s = loadSite();
  return {
    title: { default: s.seoTitle || s.siteName, template: `%s — ${s.siteName}` },
    description: s.seoDescription || s.tagline,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const s = loadSite();
  const fontsUrl = googleFontsUrl(collectUsedFonts());
  const style: Record<string, string> = {
    "--font-body": fontStack(s.fontBody),
    "--font-heading": fontStack(s.fontHeading || s.fontBody),
  };
  const bg = resolveBackground(s.pageBackground);
  const text = resolveText(s.pageText);
  if (bg) style["--paper"] = bg;
  if (text) style["--ink"] = text;
  return (
    <html lang="en" data-theme={s.theme} style={style as CSSProperties}>
      <head>
        {fontsUrl ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={fontsUrl} />
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
