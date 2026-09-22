import { Suspense } from "react";
import { EditorRoute } from "@/components/editor/EditorRoute";

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-neutral-500">Loading editor…</div>}>
      <EditorRoute />
    </Suspense>
  );
}
