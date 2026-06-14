import { NextRequest, NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, isValidDemoAccessToken } from "@/lib/demo-auth";

const AUTH_SESSION_COOKIE = "portions_session";

const protectedPrefixes = [
  "/dashboard",
  "/demo-script",
  "/action-center",
  "/notifications",
  "/communications",
  "/events",
  "/admin",
  "/account",
  "/ai-brief",
  "/patients",
  "/follow-ups",
  "/orders",
  "/branches",
  "/stock",
  "/reports",
  "/settings",
  "/pilot-requests",
  "/pilot-command",
  "/executive-pack",
  "/onboarding",
  "/imports"
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (sessionToken) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  const valid = await isValidDemoAccessToken(token);

  if (valid) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/demo-script/:path*",
    "/action-center/:path*",
    "/notifications/:path*",
    "/communications/:path*",
    "/events/:path*",
    "/admin/:path*",
    "/account/:path*",
    "/ai-brief/:path*",
    "/patients/:path*",
    "/follow-ups/:path*",
    "/orders/:path*",
    "/branches/:path*",
    "/stock/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/pilot-requests/:path*",
    "/pilot-command/:path*",
    "/executive-pack/:path*",
    "/onboarding/:path*",
    "/imports/:path*"
  ]
};
