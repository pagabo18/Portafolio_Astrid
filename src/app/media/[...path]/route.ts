import { NextResponse, type NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";

/** Serves files for the local storage driver. Other drivers use direct URLs. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const key = path.join("/");
  if (key.includes("..")) return new NextResponse("Bad request", { status: 400 });
  const file = await getStorage().get(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(file.data.byteLength),
    },
  });
}
