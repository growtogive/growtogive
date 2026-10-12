// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Check directly for NextAuth v5 (authjs) or v4 session cookies
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = !!sessionToken;

  const protectedPaths = ["/marketplace", "/listings/new"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL("/signup", req.url);

    // 1. Capture the referral ID (assuming it's named 'ref') and forward it
    const ref = searchParams.get("ref");
    if (ref) {
      signInUrl.searchParams.set("ref", ref);
    }

    // 2. Preserve the full pathname + query string as the callbackUrl
    const fullPathWithQuery = req.nextUrl.pathname + req.nextUrl.search;
    signInUrl.searchParams.set("callbackUrl", fullPathWithQuery);

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/marketplace",
    "/marketplace/:path*",
    "/listings/new",
    "/listings/:path*/edit",
  ],
};