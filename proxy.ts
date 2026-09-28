import { withAuth } from "next-auth/middleware";

export default withAuth();

export const config = {
  matcher: ["/marketplace", "/marketplace/:path*", "/listings", "/listings/:path*"],
};