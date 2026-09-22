import { Suspense } from "react";
import { PhotoLibrary } from "@/components/admin/PhotoLibrary";

export default function PhotosPage() {
  return (
    <Suspense>
      <PhotoLibrary />
    </Suspense>
  );
}
