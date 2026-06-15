import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { hashSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORM_SESSION_COOKIE } from "@/lib/platform-auth";

export async function POST(request: Request) {
  const token = (await cookies()).get(PLATFORM_SESSION_COOKIE)?.value;
  if (token) {
    await prisma.platformSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set({ name: PLATFORM_SESSION_COOKIE, value: "", path: "/", expires: new Date(0) });
  return response;
}
