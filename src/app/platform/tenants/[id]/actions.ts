"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { PlatformRole } from "@prisma/client";
import { requirePlatformUser } from "@/lib/platform-auth";
import { createManualInvitationDelivery } from "@/lib/invitation-delivery";
import { createTenantOwnerInvitation, revokeTenantOwnerInvitation } from "@/lib/tenant-invitations";

export type OwnerInvitationState =
  | {
      ok: true;
      invitationId: string;
      invitationUrl: string;
      expiresAt: string;
      deliveryMode: "MANUAL";
      error?: "";
    }
  | {
      ok: false;
      error: string;
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
    const delivery = createManualInvitationDelivery();
    revalidatePath(`/platform/tenants/${tenantId}`);
    return {
      ok: true,
      invitationId: result.invitation.id,
      invitationUrl: `${await getRequestOrigin()}/tenant-invite/${result.token}`,
      expiresAt: result.invitation.expiresAt.toISOString(),
      deliveryMode: delivery.mode
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Owner invitation could not be created." };
  }
}

export async function revokeOwnerInvitationAction(tenantId: string, formData: FormData) {
  const actor = await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const invitationId = clean(formData.get("invitationId"));
  if (!invitationId) return;
  await revokeTenantOwnerInvitation(tenantId, invitationId, actor);
  revalidatePath(`/platform/tenants/${tenantId}`);
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "localhost:3000";
  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${protocol}://${host}`;
}
