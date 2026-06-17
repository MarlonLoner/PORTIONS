"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformRole } from "@prisma/client";
import { requirePlatformUser } from "@/lib/platform-auth";
import { createManualInvitationDelivery, isInvitationEmailConfigured, sendInvitationEmail } from "@/lib/invitation-delivery";
import { reviewTenantOnboarding } from "@/lib/onboarding";
import { createTenantOwnerInvitation, revokeTenantOwnerInvitation } from "@/lib/tenant-invitations";
import { prisma } from "@/lib/prisma";

export type OwnerInvitationState =
  | {
      ok: true;
      invitationId: string;
      invitationUrl: string;
      expiresAt: string;
      deliveryMode: "MANUAL" | "EMAIL";
      deliveryStatus: "CREATED" | "SENT" | "FAILED" | "NOT_CONFIGURED";
      recipientEmail: string;
      providerMessageId?: string;
      deliveryError?: string;
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
  const deliveryMethod = clean(formData.get("deliveryMethod")) === "EMAIL" ? "EMAIL" : "MANUAL";
  try {
    if (deliveryMethod === "EMAIL" && !isInvitationEmailConfigured()) {
      return { ok: false, error: "Email delivery is not configured. Use Copy secure link." };
    }
    const result = await createTenantOwnerInvitation(tenantId, { name, email }, actor);
    const invitationUrl = `${await getRequestOrigin()}/tenant-invite/${result.token}`;
    const delivery = deliveryMethod === "EMAIL"
      ? await sendInvitationEmail({
          recipientName: result.invitation.name,
          recipientEmail: result.invitation.email,
          tenantName: result.tenant.name,
          invitationUrl,
          expiresAt: result.invitation.expiresAt
        })
      : createManualInvitationDelivery();

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: "PLATFORM_USER",
        actorId: actor.id,
        actorLabel: `${actor.name} (${actor.role})`,
        action: delivery.mode === "EMAIL" ? "tenant.owner_invitation.email_delivery" : "tenant.owner_invitation.manual_delivery",
        recordType: "TenantUserInvitation",
        recordId: result.invitation.id,
        outcome: delivery.ok ? "SUCCESS" : "FAILED",
        metadata: {
          deliveryMode: delivery.mode,
          deliveryStatus: delivery.status,
          providerMessageId: delivery.providerMessageId,
          error: delivery.error,
          recipientEmail: result.invitation.email
        }
      }
    });

    return {
      ok: true,
      invitationId: result.invitation.id,
      invitationUrl,
      expiresAt: result.invitation.expiresAt.toISOString(),
      deliveryMode: delivery.mode,
      deliveryStatus: delivery.status,
      recipientEmail: result.invitation.email,
      providerMessageId: delivery.providerMessageId,
      deliveryError: delivery.error
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

export async function reviewTenantOnboardingAction(tenantId: string, formData: FormData) {
  await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const decision = clean(formData.get("decision"));
  const reviewNotes = clean(formData.get("reviewNotes"));

  if (!["UNDER_REVIEW", "REQUEST_CHANGES", "APPROVE", "BLOCK"].includes(decision)) {
    redirect(`/platform/tenants/${tenantId}?error=${encodeURIComponent("Select a valid onboarding review decision.")}`);
  }

  try {
    await reviewTenantOnboarding({
      tenantId,
      decision: decision as "UNDER_REVIEW" | "REQUEST_CHANGES" | "APPROVE" | "BLOCK",
      reviewNotes
    });
  } catch (error) {
    redirect(`/platform/tenants/${tenantId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Onboarding review could not be updated.")}`);
  }

  revalidatePath(`/platform/tenants/${tenantId}`);
  redirect(`/platform/tenants/${tenantId}?success=${encodeURIComponent("Onboarding review updated.")}`);
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host") ?? process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, "") ?? "localhost:3000";
  const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? `${protocol}://${host}`;
}
