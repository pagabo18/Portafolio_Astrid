import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

/**
 * Tiny stand-in for the GitHub API used by `npm run dev:local`. It serves the
 * working tree of this checkout so you can use the admin without a token:
 * "commits" simply write files to disk (commit them with git when you like),
 * history comes from `git log`. Only the endpoints the admin uses exist.
 */
const ROOT = process.cwd();
const PORT = Number(process.env.LOCAL_GITHUB_PORT ?? 4010);
const blobs = new Map<string, Buffer>();

const sha1 = (b: Buffer) => createHash("sha1").update(b).digest("hex");
const json = (res: http.ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" });
  res.end(JSON.stringify(body));
};
const safe = (p: string) => {
  const full = path.join(ROOT, p);
  if (!full.startsWith(ROOT)) throw new Error("bad path");
  return full;
};
const readBody = (req: http.IncomingMessage) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

function walk(dir: string, out: { path: string; type: "blob" | "tree"; sha: string; size: number }[], rel = "") {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push({ path: r, type: "tree", sha: "", size: 0 });
      walk(path.join(dir, e.name), out, r);
    } else out.push({ path: r, type: "blob", sha: "", size: fs.statSync(path.join(dir, e.name)).size });
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const p = url.pathname;
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (p === "/user") return json(res, 200, { login: "local" });
    if (p.startsWith("/raw/")) {
      const f = safe(decodeURIComponent(p.slice(5)));
      if (!fs.existsSync(f)) return json(res, 404, { message: "Not Found" });
      res.writeHead(200, { "content-type": f.endsWith(".webp") ? "image/webp" : f.endsWith(".png") ? "image/png" : f.endsWith(".avif") ? "image/avif" : "image/jpeg", "access-control-allow-origin": "*", "cache-control": "no-cache" });
      return fs.createReadStream(f).pipe(res);
    }
    const m = p.match(/^\/repos\/[^/]+\/[^/]+(\/.*)?$/);
    if (!m) return json(res, 404, { message: "Not Found" });
    const sub = m[1] ?? "";
    if (sub === "") return json(res, 200, { permissions: { push: true, admin: true } });
    if (sub.startsWith("/contents/")) {
      const rel = decodeURIComponent(sub.slice("/contents/".length));
      const ref = url.searchParams.get("ref");
      if (ref && ref !== "main") {
        try {
          const out = execFileSync("git", ["show", `${ref}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 });
          res.writeHead(200, { "content-type": "text/plain", "access-control-allow-origin": "*" });
          return res.end(out);
        } catch {
          return json(res, 404, { message: "Not Found" });
        }
      }
      const f = safe(rel);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return json(res, 404, { message: "Not Found" });
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" });
      return res.end(fs.readFileSync(f));
    }
    if (sub.startsWith("/git/ref/heads/")) return json(res, 200, { object: { sha: "local-head" } });
    if (sub.startsWith("/git/commits/") && req.method === "GET") return json(res, 200, { tree: { sha: "local-tree" } });
    if (sub.startsWith("/git/trees/") && req.method === "GET") return json(res, 200, { tree: walk(path.join(ROOT, "content"), [], "content"), truncated: false });
    if (sub === "/git/blobs" && req.method === "POST") {
      const b = JSON.parse(await readBody(req)) as { content: string; encoding: string };
      const buf = b.encoding === "base64" ? Buffer.from(b.content, "base64") : Buffer.from(b.content, "utf8");
      const sha = sha1(buf);
      blobs.set(sha, buf);
      return json(res, 201, { sha });
    }
    if (sub === "/git/trees" && req.method === "POST") {
      const t = JSON.parse(await readBody(req)) as { tree: { path: string; sha: string | null }[] };
      for (const e of t.tree) {
        const f = safe(e.path);
        if (e.sha === null) {
          fs.rmSync(f, { force: true });
          const dir = path.dirname(f);
          if (fs.existsSync(dir) && !fs.readdirSync(dir).length) fs.rmSync(dir, { recursive: true, force: true });
        } else {
          fs.mkdirSync(path.dirname(f), { recursive: true });
          fs.writeFileSync(f, blobs.get(e.sha)!);
        }
      }
      return json(res, 201, { sha: "local-tree" });
    }
    if (sub === "/git/commits" && req.method === "POST") {
      const c = JSON.parse(await readBody(req)) as { message: string };
      console.log(`[local-github] ${c.message.split("\n")[0]}`);
      return json(res, 201, { sha: `local-${Date.now()}` });
    }
    if (sub.startsWith("/git/refs/heads/") && req.method === "PATCH") return json(res, 200, {});
    if (sub === "/commits") {
      const rel = url.searchParams.get("path") ?? "";
      try {
        const out = execFileSync("git", ["log", "--format=%H%x1f%s%x1f%aI%x1f%an", "-n", "30", "--", rel], { cwd: ROOT }).toString().trim();
        const list = out ? out.split("\n").map((l) => { const [sha, s, d, a] = l.split("\x1f"); return { sha, commit: { message: s, author: { date: d, name: a } } }; }) : [];
        return json(res, 200, list);
      } catch {
        return json(res, 200, []);
      }
    }
    json(res, 404, { message: `Not Found: ${req.method} ${p}` });
  } catch (e) {
    json(res, 500, { message: e instanceof Error ? e.message : "error" });
  }
});

server.listen(PORT, () => console.log(`[local-github] serving ${ROOT} on http://localhost:${PORT} (no token needed)`));
