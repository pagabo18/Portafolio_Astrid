import { Suspense } from "react";
import { DraftPreview } from "@/components/public/DraftPreview";

export const metadata = { title: "Draft preview", robots: { index: false, follow: false } };

export default function PreviewPage() {
  return (
    <Suspense fallback={null}>
      <DraftPreview />
    </Suspense>
  );
}
