"use client";

import { useState } from "react";
import { repoFromEnv } from "@/lib/github/client";
import { signIn } from "@/lib/content/admin";

export function LoginForm() {
  const env = repoFromEnv();
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState(env.owner && env.repo ? `${env.owner}/${env.repo}` : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const [owner, name] = repo.split("/");
    if (!owner || !name) return setError("Repository must look like owner/name.");
    setBusy(true);
    setError(null);
    try {
      await signIn({ owner, repo: name, branch: env.branch, token: token.trim(), apiBase: env.apiBase, rawBase: env.rawBase });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="mb-8">
          <div className="eyebrow">Portfolio</div>
          <h1 className="mt-1 text-2xl font-light">Admin</h1>
        </div>
        <div>
          <label className="ui-label" htmlFor="repo">GitHub repository</label>
          <input id="repo" className="ui-input" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/name" autoComplete="off" />
        </div>
        <div>
          <label className="ui-label" htmlFor="token">GitHub access token</label>
          <input id="token" className="ui-input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="current-password" required />
          <p className="mt-1 text-[10.5px] leading-relaxed text-neutral-400">
            A fine-grained personal access token limited to this repository with <em>Contents: read and write</em>. It stays in this browser only and is the only credential that can change the site.
          </p>
        </div>
        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
        <button className="ui-btn ui-btn-primary w-full justify-center" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
