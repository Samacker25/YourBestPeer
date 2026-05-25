import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/auth/google/callback"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/auth/google"));

  // Token is in localStorage — we can't read it server-side. Instead let the
  // client-side useAuth hook handle redirects. Middleware just guards the
  // dashboard routes from being rendered as static pages without JS.
  if (!isPublic && pathname.startsWith("/(dashboard)")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
