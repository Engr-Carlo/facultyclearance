import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROLE_HOME: Record<string, string> = {
  professor: "/dashboard/professor",
  chair: "/dashboard/chair",
  dean: "/dashboard/dean",
  admin: "/dashboard/admin",
};

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

    // Enforce role-scoped dashboard access
    if (pathname.startsWith("/dashboard/")) {
      const segment = pathname.split("/")[2]; // professor | chair | dean | admin
      if (!role || ROLE_HOME[role] !== `/dashboard/${segment}`) {
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
  matcher: ["/", "/dashboard/:path*"],
};
