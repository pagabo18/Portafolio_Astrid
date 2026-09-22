import { z } from "zod";
import { admin, body } from "@/lib/api/handler";
import { findUserByEmail, setPassword } from "@/lib/data/users";
import { validatePassword, verifyPassword } from "@/lib/auth/password";

export const POST = admin(async (req, { user }) => {
  const { current, next } = await body(req, z.object({ current: z.string(), next: z.string() }));
  const err = validatePassword(next);
  if (err) throw new Error(err);
  const u = await findUserByEmail(user.email);
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw new Error("Current password is incorrect");
  await setPassword(u.id, next);
  return { ok: true, relogin: true };
});
