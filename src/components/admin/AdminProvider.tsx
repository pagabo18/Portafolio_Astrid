"use client";

import { useEffect, useState, type ReactNode } from "react";
import { repoFromEnv } from "@/lib/github/client";
import { REPO_KEY, TOKEN_KEY, signIn, useAdminState } from "@/lib/content/admin";
import { LoginForm } from "./LoginForm";
import { AdminShell } from "./AdminShell";

/**
 * Gate for every admin page: restores the session from localStorage, shows
 * the sign-in form otherwise, loads the content, then renders the shell.
 */
export function AdminProvider({ children, bare }: { children: ReactNode; bare?: boolean }) {
  const client = useAdminState((s) => s.client);
  const loaded = useAdminState((s) => s.loaded);
  const loading = useAdminState((s) => s.loading);
  const error = useAdminState((s) => s.error);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    if (client) return;
    let token: string | null = null;
    let repo: { owner: string; repo: string; branch: string } | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
      const r = localStorage.getItem(REPO_KEY);
      repo = r ? JSON.parse(r) : null;
    } catch {
      /* ignore */
    }
    const env = repoFromEnv();
    const cfg = { ...env, ...(repo ?? {}) };
    const attempt = token && cfg.owner && cfg.repo ? signIn({ ...cfg, token }).catch(() => localStorage.removeItem(TOKEN_KEY)) : env.apiBase && env.owner && env.repo ? signIn({ ...env, token: "local" }).catch(() => {}) : Promise.resolve();
    attempt.finally(() => setRestoring(false));
  }, [client]);

  if (restoring && !client) return <Centered>Loading…</Centered>;
  if (!client) return <LoginForm />;
  if (!loaded) {
    if (loading) return <Centered>Loading content from the repository…</Centered>;
    if (error) return <Centered><span className="text-red-600">{error}</span></Centered>;
  }
  if (bare) return <>{children}</>;
  return <AdminShell>{children}</AdminShell>;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-[12px] text-neutral-500">{children}</div>;
}
