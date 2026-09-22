/**
 * Minimal GitHub client for the browser admin. Reads files through the
 * Contents API and writes atomically through the Git Data API (one commit
 * for any number of files). Works against api.github.com or the local mock
 * (scripts/local-github.ts) via NEXT_PUBLIC_GITHUB_API.
 */
export type GitFileChange =
  | { path: string; content: string; encoding?: "utf-8" }
  | { path: string; base64: string }
  | { path: string; delete: true };

export type GitConfig = { owner: string; repo: string; branch: string; token: string; apiBase?: string; rawBase?: string };

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class GitClient {
  readonly apiBase: string;
  readonly rawBase: string;
  constructor(readonly cfg: GitConfig) {
    this.apiBase = (cfg.apiBase ?? "https://api.github.com").replace(/\/$/, "");
    this.rawBase = (cfg.rawBase ?? `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}`).replace(/\/$/, "");
  }
  private get base() {
    return `${this.apiBase}/repos/${this.cfg.owner}/${this.cfg.repo}`;
  }

  async request<T>(url: string, init: RequestInit & { raw?: boolean } = {}): Promise<T> {
    const res = await fetch(url.startsWith("http") ? url : `${this.apiBase}${url}`, {
      ...init,
      headers: {
        Accept: init.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}),
        ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new GitHubError(msg, res.status);
    }
    if (init.raw) return (await res.text()) as unknown as T;
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** Who am I + can I push? */
  async verify(): Promise<{ login: string; canPush: boolean }> {
    const user = await this.request<{ login: string }>("/user");
    const repo = await this.request<{ permissions?: { push?: boolean; admin?: boolean } }>(`${this.base}`);
    return { login: user.login, canPush: !!(repo.permissions?.push || repo.permissions?.admin) };
  }

  /** Raw text content of a file at the branch head (null if missing). */
  async readText(path: string, ref = this.cfg.branch): Promise<string | null> {
    try {
      return await this.request<string>(`${this.base}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, { raw: true });
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  async readJson<T>(path: string, ref?: string): Promise<T | null> {
    const t = await this.readText(path, ref);
    if (t === null) return null;
    return JSON.parse(t) as T;
  }

  /** Recursive listing of a directory (paths relative to repo root). */
  async listTree(prefix: string): Promise<{ path: string; type: "blob" | "tree"; sha: string; size?: number }[]> {
    const head = await this.head();
    const tree = await this.request<{ tree: { path: string; type: "blob" | "tree"; sha: string; size?: number }[]; truncated: boolean }>(
      `${this.base}/git/trees/${head.treeSha}?recursive=1`,
    );
    const p = prefix.replace(/\/$/, "") + "/";
    return tree.tree.filter((t) => t.path.startsWith(p));
  }

  async head(): Promise<{ commitSha: string; treeSha: string }> {
    const ref = await this.request<{ object: { sha: string } }>(`${this.base}/git/ref/heads/${this.cfg.branch}`);
    const commit = await this.request<{ tree: { sha: string } }>(`${this.base}/git/commits/${ref.object.sha}`);
    return { commitSha: ref.object.sha, treeSha: commit.tree.sha };
  }

  /**
   * Atomic multi-file commit. Retries once if the branch moved meanwhile.
   * Returns the new commit sha and the blob shas of the written files.
   */
  async commit(message: string, changes: GitFileChange[], attempt = 0): Promise<{ sha: string; blobs: Record<string, string> }> {
    const head = await this.head();
    const blobs: Record<string, string> = {};
    const entries: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];
    for (const c of changes) {
      if ("delete" in c) {
        entries.push({ path: c.path, mode: "100644", type: "blob", sha: null });
        continue;
      }
      const body = "base64" in c ? { content: c.base64, encoding: "base64" } : { content: c.content, encoding: "utf-8" };
      const blob = await this.request<{ sha: string }>(`${this.base}/git/blobs`, { method: "POST", body: JSON.stringify(body) });
      blobs[c.path] = blob.sha;
      entries.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    const tree = await this.request<{ sha: string }>(`${this.base}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: head.treeSha, tree: entries }) });
    const commit = await this.request<{ sha: string }>(`${this.base}/git/commits`, {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [head.commitSha] }),
    });
    try {
      await this.request(`${this.base}/git/refs/heads/${this.cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 422 || e.status === 409) && attempt < 2) {
        return this.commit(message, changes, attempt + 1);
      }
      throw e;
    }
    return { sha: commit.sha, blobs };
  }

  /** Commit history touching a path (newest first). */
  async history(path: string, limit = 30): Promise<{ sha: string; message: string; date: string; author: string }[]> {
    const list = await this.request<{ sha: string; commit: { message: string; author: { date: string; name: string } } }[]>(
      `${this.base}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(this.cfg.branch)}&per_page=${limit}`,
    );
    return list.map((c) => ({ sha: c.sha, message: c.commit.message, date: c.commit.author.date, author: c.commit.author.name }));
  }

  rawUrl(path: string) {
    return `${this.rawBase}/${encodePath(path)}`;
  }
  blobPageUrl(path: string) {
    return `https://github.com/${this.cfg.owner}/${this.cfg.repo}/blob/${this.cfg.branch}/${encodePath(path)}`;
  }
}

export function encodePath(p: string) {
  return p.split("/").map(encodeURIComponent).join("/");
}

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

/** Resolve repo configuration from env (build-time) with optional overrides. */
export function repoFromEnv(): { owner: string; repo: string; branch: string; apiBase?: string; rawBase?: string } {
  const apiBase = process.env.NEXT_PUBLIC_GITHUB_API || undefined;
  // the local mock (npm run dev:local) serves the checkout itself: any name works
  const [owner = apiBase ? "local" : "", repo = apiBase ? "portfolio" : ""] = (process.env.NEXT_PUBLIC_GITHUB_REPO ?? "").split("/").filter(Boolean);
  return {
    owner,
    repo,
    branch: process.env.NEXT_PUBLIC_GITHUB_BRANCH || "main",
    apiBase,
    rawBase: process.env.NEXT_PUBLIC_GITHUB_RAW ? `${process.env.NEXT_PUBLIC_GITHUB_RAW}` : undefined,
  };
}
