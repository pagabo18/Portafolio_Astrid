/** Small fetch helper for the admin UI. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  if (res.status === 401) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- outside React; a full reload clears stale state
    if (typeof window !== "undefined") window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError("Unauthorized", 401);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatRatio(r: number) {
  const pairs: [number, string][] = [
    [1, "1:1"], [1.5, "3:2"], [0.667, "2:3"], [1.333, "4:3"], [0.75, "3:4"], [1.25, "5:4"], [0.8, "4:5"], [1.778, "16:9"], [0.5625, "9:16"], [2.333, "21:9"], [2, "2:1"], [3, "3:1"],
  ];
  let best = pairs[0];
  for (const p of pairs) if (Math.abs(p[0] - r) < Math.abs(best[0] - r)) best = p;
  return Math.abs(best[0] - r) < 0.03 ? best[1] : r.toFixed(2);
}

export function timeAgo(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`;
  return d.toLocaleDateString();
}
