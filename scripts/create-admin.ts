import "./_env";
import { createInterface } from "node:readline/promises";
import { createUser, findUserByEmail, setPassword } from "../src/lib/data/users";
import { validatePassword } from "../src/lib/auth/password";

/**
 * Creates (or resets the password of) an admin user.
 *   npm run admin:create -- you@example.com "a long password"
 * or interactively without arguments.
 */
async function main() {
  let [email, password] = process.argv.slice(2);
  if (!email || !password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    email = email || (await rl.question("Admin email: "));
    password = password || (await rl.question("Password (10+ chars): "));
    rl.close();
  }
  const err = validatePassword(password);
  if (err) throw new Error(err);
  const existing = await findUserByEmail(email);
  if (existing) {
    await setPassword(existing.id, password);
    console.log(`Password updated for ${email}`);
  } else {
    await createUser(email, password, "Admin");
    console.log(`Admin created: ${email}`);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
