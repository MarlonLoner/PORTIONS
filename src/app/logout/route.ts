import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, destroyCurrentSession } from "@/lib/auth";
import { DEMO_ACCESS_COOKIE } from "@/lib/demo-auth";

export async function GET(request: Request) {
  await destroyCurrentSession().catch(() => null);
  const response = NextResponse.redirect(new URL("/", request.url));
  for (const name of [AUTH_SESSION_COOKIE, DEMO_ACCESS_COOKIE]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
  }
  return response;
}
