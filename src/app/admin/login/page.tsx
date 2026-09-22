import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { userCount } from "@/lib/data/users";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Admin login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  const { next } = await searchParams;
  if (user) redirect(next && next.startsWith("/admin") ? next : "/admin");
  const noUsers = (await userCount()) === 0;
  const envReady = !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="eyebrow">Portfolio</div>
          <h1 className="mt-1 text-2xl font-light">Admin</h1>
        </div>
        <LoginForm next={next} />
        {noUsers ? (
          <p className="mt-8 rounded-sm border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
            {envReady
              ? "No admin exists yet. Sign in with the ADMIN_EMAIL / ADMIN_PASSWORD from your environment to create it."
              : "No admin exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local (or run npm run admin:create) and sign in."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
