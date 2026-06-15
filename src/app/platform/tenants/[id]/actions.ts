"use server";

import { revalidatePath } from "next/cache";
import { PlatformRole } from "@prisma/client";
import { requirePlatformUser } from "@/lib/platform-auth";
import { createTenantOwnerInvitation, revokeTenantOwnerInvitation } from "@/lib/tenant-invitations";

export type OwnerInvitationState = {
  error: string;
  token: string;
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function createOwnerInvitationAction(tenantId: string, _state: OwnerInvitationState, formData: FormData): Promise<OwnerInvitationState> {
  const actor = await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email"));
  try {
    const result = await createTenantOwnerInvitation(tenantId, { name, email }, actor);
    revalidatePath(`/platform/tenants/${tenantId}`);
    return { error: "", token: result.token };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Owner invitation could not be created.", token: "" };
  }
}

export async function revokeOwnerInvitationAction(tenantId: string, formData: FormData) {
  const actor = await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const invitationId = clean(formData.get("invitationId"));
  if (!invitationId) return;
  await revokeTenantOwnerInvitation(tenantId, invitationId, actor);
  revalidatePath(`/platform/tenants/${tenantId}`);
}
