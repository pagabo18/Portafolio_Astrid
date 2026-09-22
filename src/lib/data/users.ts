import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { id as newId } from "@/lib/ids";
import { hashPassword } from "@/lib/auth/password";

export async function userCount() {
  const db = await getDb();
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
  return r?.n ?? 0;
}

export async function findUserByEmail(email: string) {
  const db = await getDb();
  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim()));
  return u ?? null;
}

export async function createUser(email: string, password: string, name = "") {
  const db = await getDb();
  const [u] = await db
    .insert(schema.users)
    .values({ id: newId("usr"), email: email.toLowerCase().trim(), passwordHash: await hashPassword(password), name })
    .returning();
  return u;
}

export async function setPassword(userId: string, password: string) {
  const db = await getDb();
  await db.update(schema.users).set({ passwordHash: await hashPassword(password) }).where(eq(schema.users.id, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}

/**
 * First-run bootstrap: if there are no users and ADMIN_EMAIL / ADMIN_PASSWORD
 * are present in the environment, create the admin. The password is only
 * ever stored as a bcrypt hash.
 */
export async function bootstrapAdminFromEnv() {
  if ((await userCount()) > 0) return null;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return createUser(email, password, "Admin");
}
