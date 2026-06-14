import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, destroyCurrentSession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroyCurrentSession().catch(() => null);
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
