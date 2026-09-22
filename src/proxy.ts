import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate for the admin area. It only checks that a session cookie exists;
 * the real verification against the database happens in `requireAdmin()` on
 * every admin page and API route (the cookie alone never grants access).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has("pf_session");

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!hasCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith("/api/admin") && !hasCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
