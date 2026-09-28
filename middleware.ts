import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/signup",
    },
  }
);

export const config = {
  matcher: [
    "/marketplace",
    "/marketplace/:path*",
    "/listings/new",
    "/listings/:path*/edit"
  ],
};