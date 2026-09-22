import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { requireAdminApi } from "@/lib/auth/session";

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: Request, ctx: { params: P; user: { id: string; email: string } }) => Promise<Response | unknown>;

/** Wraps an admin route: auth, error handling, JSON output. */
export function admin<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      const user = await requireAdminApi();
      const params = (await ctx.params) ?? ({} as P);
      const out = await fn(req, { params, user });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof Response) return e;
      if (e instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: e.issues }, { status: 400 });
      const msg = e instanceof Error ? e.message : "Server error";
      console.error("[api]", e);
      return NextResponse.json({ error: msg }, { status: msg.includes("not found") ? 404 : 500 });
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const json = await req.json().catch(() => ({}));
  return schema.parse(json);
}

export function query(req: Request) {
  return new URL(req.url).searchParams;
}
