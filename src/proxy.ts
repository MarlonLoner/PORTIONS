import { NextRequest, NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, isValidDemoAccessToken } from "@/lib/demo-auth";

const AUTH_SESSION_COOKIE = "portions_session";
const PLATFORM_SESSION_COOKIE = "portions_platform_session";

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

const platformPublicPrefixes = ["/platform/setup", "/platform/login"];
const platformProtectedPrefixes = ["/platform"];
const demoBlockedPrefixes = [
  "/admin/users",
  "/admin/operating-units",
  "/setup",
  "/account/change-password",
  "/platform"
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPlatformPublicPath(pathname: string) {
  return platformPublicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPlatformProtectedPath(pathname: string) {
  return platformProtectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) && !isPlatformPublicPath(pathname);
}

function isDemoBlockedPath(pathname: string) {
  return demoBlockedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (isPlatformPublicPath(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isPlatformProtectedPath(pathname)) {
    const platformToken = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value;
    if (platformToken) return NextResponse.next({ request: { headers: requestHeaders } });
    const redirectUrl = new URL("/platform/login", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

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
    if (isDemoBlockedPath(pathname)) {
      return NextResponse.redirect(new URL("/access-denied", request.url));
    }
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
    "/imports/:path*",
    "/platform/:path*"
  ]
};
