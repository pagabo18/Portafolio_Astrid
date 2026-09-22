import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/AdminShell";
import { listProjectsAdmin } from "@/lib/data/projects";
import { listPages } from "@/lib/data/pages";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const [projects, pages] = await Promise.all([listProjectsAdmin(), listPages()]);
  const unpublished = projects.filter((p) => p.hasUnpublished && p.status !== "archived").length + pages.filter((p) => p.hasUnpublished).length;
  return (
    <AdminShell user={user} unpublished={unpublished}>
      {children}
    </AdminShell>
  );
}
