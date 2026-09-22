import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Object storage abstraction.
 *
 *  STORAGE_DRIVER=local     (default) files under ./storage, served by /media/*
 *  STORAGE_DRIVER=supabase  Supabase Storage bucket (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET)
 *
 * Originals are never modified; variants live next to them.
 */
export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(keys: string[]): Promise<void>;
  /** Public URL for a stored key. */
  url(key: string): string;
}

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
};
export function contentTypeFor(key: string, fallback = "application/octet-stream") {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? fallback;
}

function safeKey(key: string) {
  const norm = path.posix.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  if (norm.includes("..")) throw new Error("Invalid storage key");
  return norm;
}

class LocalStorage implements StorageAdapter {
  constructor(private root: string) {}
  private full(key: string) {
    return path.join(this.root, safeKey(key));
  }
  async put(key: string, data: Buffer) {
    const f = this.full(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, data);
  }
  async get(key: string) {
    try {
      const data = await fs.readFile(this.full(key));
      return { data, contentType: contentTypeFor(key) };
    } catch {
      return null;
    }
  }
  async delete(keys: string[]) {
    await Promise.all(keys.map((k) => fs.rm(this.full(k), { force: true })));
  }
  url(key: string) {
    return `/media/${safeKey(key)}`;
  }
}

class SupabaseStorage implements StorageAdapter {
  private clientPromise: Promise<import("@supabase/supabase-js").SupabaseClient> | null = null;
  constructor(private baseUrl: string, private serviceKey: string, private bucket: string) {}
  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import("@supabase/supabase-js").then((m) =>
        m.createClient(this.baseUrl, this.serviceKey, { auth: { persistSession: false } }),
      );
    }
    return this.clientPromise;
  }
  async put(key: string, data: Buffer, contentType: string) {
    const c = await this.client();
    const { error } = await c.storage.from(this.bucket).upload(safeKey(key), data, { contentType, upsert: true });
    if (error) throw error;
  }
  async get(key: string) {
    const c = await this.client();
    const { data, error } = await c.storage.from(this.bucket).download(safeKey(key));
    if (error || !data) return null;
    return { data: Buffer.from(await data.arrayBuffer()), contentType: data.type || contentTypeFor(key) };
  }
  async delete(keys: string[]) {
    if (!keys.length) return;
    const c = await this.client();
    await c.storage.from(this.bucket).remove(keys.map(safeKey));
  }
  url(key: string) {
    return `${this.baseUrl}/storage/v1/object/public/${this.bucket}/${safeKey(key)}`;
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (adapter) return adapter;
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (driver === "supabase") {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_BUCKET ?? "photos";
    if (!url || !key) throw new Error("STORAGE_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    adapter = new SupabaseStorage(url, key, bucket);
  } else {
    adapter = new LocalStorage(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));
  }
  return adapter!;
}
