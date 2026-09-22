import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { findUserByEmail, bootstrapAdminFromEnv } from "@/lib/data/users";
import { verifyPassword } from "@/lib/auth/password";
import { clearLoginFailures, createSession, loginAllowed, recordLoginFailure } from "@/lib/auth/session";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!loginAllowed(ip)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  await bootstrapAdminFromEnv();
  const user = await findUserByEmail(parsed.data.email);
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : await verifyPassword(parsed.data.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");
  if (!user || !ok) {
    recordLoginFailure(ip);
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  clearLoginFailures(ip);
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
