import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "pf_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const h = await headers();
  await db.insert(schema.sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  });
  // opportunistic cleanup
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export type AuthUser = { id: string; email: string; name: string };

/** Returns the logged in admin or null. Safe to call from server components. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, exp: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, email: r.email, name: r.name };
}

/** For server components / actions: redirect to login if not authenticated. */
export async function requireAdmin(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/admin/login");
  return u;
}

/** For route handlers: throw a 401 Response if not authenticated. */
export async function requireAdminApi(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });
  return u;
}

/* Very small in-memory rate limiter for the login form. */
const attempts = new Map<string, { n: number; t: number }>();
export function loginAllowed(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.t > 15 * 60_000) return true;
  return a.n < 8;
}
export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.t > 15 * 60_000) attempts.set(ip, { n: 1, t: now });
  else a.n++;
}
export function clearLoginFailures(ip: string) {
  attempts.delete(ip);
}
