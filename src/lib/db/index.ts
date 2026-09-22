import "server-only";
import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/**
 * Database client.
 *
 *  - Production: set DATABASE_URL (Supabase Postgres, Neon, RDS…).
 *  - Local development without any external service: PGlite (embedded
 *    Postgres) persisted under ./data/pglite. Same schema, same SQL.
 *
 * Migrations from ./drizzle run automatically on first access so the project
 * works with a single `npm run dev`.
 */

export type Db = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

type G = typeof globalThis & { __portfolioDb?: Promise<Db> };
const g = globalThis as G;

const migrationsFolder = path.join(process.cwd(), "drizzle");

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const client = postgres(url, { max: 10, prepare: false });
    const db = drizzlePg(client, { schema });
    if (process.env.DB_AUTO_MIGRATE !== "false") {
      await migratePg(db, { migrationsFolder });
    }
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), "data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  await client.waitReady;
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder });
  return db;
}

export function getDb(): Promise<Db> {
  if (!g.__portfolioDb) {
    g.__portfolioDb = create().catch((e) => {
      g.__portfolioDb = undefined;
      throw e;
    });
  }
  return g.__portfolioDb;
}

export { schema };
