import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const ROLE_ROUTES: Record<string, string[]> = {
  "/dashboard": ["ADMIN", "CEO", "ACCOUNTANT"],
  "/buyers": ["ADMIN", "CEO", "ACCOUNTANT"],
  "/vendors": ["ADMIN", "CEO", "ACCOUNTANT"],
  "/payments": ["ADMIN", "CEO", "ACCOUNTANT"],
  "/reports": ["ADMIN", "CEO", "ACCOUNTANT"],
  "/settings": ["ADMIN"],
  "/requests/new": ["ADMIN", "PRODUCTION"],
  "/orders/new": ["ADMIN", "CEO", "ACCOUNTANT"],
};

export default auth((req) => {
  const { nextUrl, auth: session } = req as NextRequest & {
    auth: { user?: { role?: string; mustChangePassword?: boolean } } | null;
  };

  const isAuth = !!session?.user;
  const pathname = nextUrl.pathname;

  // Public paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/unauthorized")
  ) {
    return NextResponse.next();
  }

  // Must be authenticated
  if (!isAuth) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session?.user?.role;
  const mustChange = session?.user?.mustChangePassword;

  // Force password change
  if (mustChange && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", nextUrl.origin));
  }

  // Check role-based access
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!allowedRoles.includes(role || "")) {
        return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
      }
      break;
    }
  }

  // Procurement page: ADMIN, ACCOUNTANT, PRODUCTION
  if (pathname.startsWith("/procurement")) {
    if (!["ADMIN", "ACCOUNTANT", "PRODUCTION"].includes(role || "")) {
      return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
