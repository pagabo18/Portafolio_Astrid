import { notFound, redirect } from "next/navigation";
import { getProjectBySlug } from "@/lib/data/projects";

export default async function BySlug({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProjectBySlug(slug);
  if (!p) notFound();
  redirect(`/admin/projects/${p.id}`);
}
