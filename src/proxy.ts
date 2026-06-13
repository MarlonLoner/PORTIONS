import { NextRequest, NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, isValidDemoAccessToken } from "@/lib/demo-auth";

const protectedPrefixes = [
  "/dashboard",
  "/demo-script",
  "/action-center",
  "/notifications",
  "/events",
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

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  const valid = await isValidDemoAccessToken(token);

  if (valid) {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/enter", request.url);
  redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/demo-script/:path*",
    "/action-center/:path*",
    "/notifications/:path*",
    "/events/:path*",
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
