"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { acceptTenantOwnerInvitation } from "@/lib/tenant-invitations";

export type TenantInviteAcceptState = {
  error: string;
};

export async function acceptTenantInvitationAction(token: string, _state: TenantInviteAcceptState, formData: FormData): Promise<TenantInviteAcceptState> {
  try {
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const session = await acceptTenantOwnerInvitation(token, { password, confirmPassword });
    (await cookies()).set({
      name: AUTH_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invitation could not be accepted." };
  }

  redirect("/onboarding");
}
