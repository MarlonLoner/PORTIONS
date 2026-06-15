"use server";

import { redirect } from "next/navigation";
import { OperatingUnitStatus, OperatingUnitType, PlatformRole, SubscriptionStatus, TenantPlan, TenantStatus } from "@prisma/client";
import { requirePlatformUser } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function createTenantAction(formData: FormData) {
  await requirePlatformUser([PlatformRole.PLATFORM_OWNER, PlatformRole.PLATFORM_ADMIN]);
  const name = clean(formData.get("name"));
  const slug = slugify(clean(formData.get("slug")) || name);
  const country = clean(formData.get("country")) || "Zimbabwe";
  const timezone = clean(formData.get("timezone")) || "Africa/Harare";
  const currency = clean(formData.get("currency")) || "USD";
  const plan = (clean(formData.get("plan")) || TenantPlan.PILOT) as TenantPlan;
  const status = (clean(formData.get("status")) || TenantStatus.SETUP) as TenantStatus;
  const subscriptionStatus = (clean(formData.get("subscriptionStatus")) || SubscriptionStatus.TRIAL) as SubscriptionStatus;
  const createOnline = clean(formData.get("createOnline")) === "on";

  if (!name || !slug) return;

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        name,
        slug,
        legalName: clean(formData.get("legalName")) || null,
        status,
        plan,
        country,
        timezone,
        currency,
        subscriptionStatus,
        primaryContactName: clean(formData.get("primaryContactName")) || null,
        primaryContactEmail: clean(formData.get("primaryContactEmail")) || null,
        primaryContactPhone: clean(formData.get("primaryContactPhone")) || null,
        activatedAt: status === TenantStatus.ACTIVE ? new Date() : null
      },
      select: { id: true, slug: true }
    });
    await tx.operatingUnit.create({
      data: {
        tenantId: created.id,
        name: "Head Office",
        code: `${created.slug.toUpperCase().replace(/-/g, "_")}_HEAD_OFFICE`,
        type: OperatingUnitType.HEAD_OFFICE,
        status: OperatingUnitStatus.SETUP,
        handlesCommunications: true,
        contactLabel: "Head Office"
      }
    });
    if (createOnline) {
      await tx.operatingUnit.create({
        data: {
          tenantId: created.id,
          name: "Online Department",
          code: `${created.slug.toUpperCase().replace(/-/g, "_")}_ONLINE`,
          type: OperatingUnitType.ONLINE_DEPARTMENT,
          status: OperatingUnitStatus.SETUP,
          handlesOnlineOrders: true,
          handlesCommunications: true,
          isPrimaryOnlineUnit: true,
          contactLabel: "Online Department"
        }
      });
    }
    await tx.auditLog.create({
      data: {
        tenantId: created.id,
        actorType: "PLATFORM_USER",
        action: "tenant.created",
        recordType: "Tenant",
        recordId: created.id,
        outcome: "SUCCESS"
      }
    });
    return created;
  });

  redirect(`/platform/tenants/${tenant.id}`);
}
