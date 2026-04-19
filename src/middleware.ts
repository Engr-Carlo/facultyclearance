import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROLE_HOME: Record<string, string> = {
  professor: "/professor",
  chair: "/chair",
  dean: "/dean",
  admin: "/admin",
};

const VALID_ROLE_SEGMENTS = new Set(["professor", "chair", "dean", "admin"]);

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    // Redirect root to role home
    if (pathname === "/") {
      const dest = role ? ROLE_HOME[role] ?? "/login" : "/login";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // Enforce role-scoped access: /professor, /chair, /dean, /admin
    const segment = pathname.split("/")[1]; // first path segment
    if (VALID_ROLE_SEGMENTS.has(segment)) {
      if (!role || ROLE_HOME[role] !== `/${segment}`) {
        const dest = role ? ROLE_HOME[role] ?? "/login" : "/login";
        return NextResponse.redirect(new URL(dest, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/", "/professor/:path*", "/chair/:path*", "/dean/:path*", "/admin/:path*"],
};
