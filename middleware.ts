export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/marketplace", "/marketplace/:path*", "/listings", "/listings/:path*"],
};