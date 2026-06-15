import { NotificationDeliveryChannel, NotificationDeliveryStatus, NotificationStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentAccessUser, hasPermission } from "@/lib/auth";
import { getNotificationCopyMessage, getNotificationSuggestedAction } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

function isStatus(value: unknown): value is NotificationStatus {
  return typeof value === "string" && Object.values(NotificationStatus).includes(value as NotificationStatus);
}

function isDeliveryChannel(value: unknown): value is NotificationDeliveryChannel {
  return typeof value === "string" && Object.values(NotificationDeliveryChannel).includes(value as NotificationDeliveryChannel);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getCurrentAccessUser();
    if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
    if (!hasPermission(user, "manageActions") && !hasPermission(user, "manageCommunications")) return NextResponse.json({ error: "You do not have permission to update notifications." }, { status: 403 });
    if (!user.tenantId) return NextResponse.json({ error: "Tenant context is required." }, { status: 403 });
    const body = await request.json();
    const existing = await prisma.notification.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!existing) return NextResponse.json({ error: "Notification was not found." }, { status: 404 });

    const data: Prisma.NotificationUpdateInput = {};
    const now = new Date();

    if ("status" in body) {
      if (!isStatus(body.status)) return NextResponse.json({ error: "Invalid notification status." }, { status: 400 });
      data.status = body.status;
      if (body.status === NotificationStatus.READ && !existing.readAt) data.readAt = now;
      if (body.status === NotificationStatus.ACKNOWLEDGED && !existing.acknowledgedAt) data.acknowledgedAt = now;
      if (body.status === NotificationStatus.RESOLVED && !existing.resolvedAt) data.resolvedAt = now;
      if (body.status === NotificationStatus.DISMISSED && !existing.resolvedAt) data.resolvedAt = now;
    }

    if ("deliveryChannel" in body) {
      if (!isDeliveryChannel(body.deliveryChannel)) return NextResponse.json({ error: "Invalid delivery channel." }, { status: 400 });
      data.deliveryChannel = body.deliveryChannel;
      data.deliveryStatus = body.deliveryChannel === NotificationDeliveryChannel.IN_APP ? NotificationDeliveryStatus.NOT_REQUIRED : NotificationDeliveryStatus.READY;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No updates were provided." }, { status: 400 });
    }

    const notification = await prisma.notification.update({
      where: { id: existing.id },
      data,
      include: {
        branch: true,
        recipientStaff: true,
        action: { include: { branch: true, assignedStaff: true } }
      }
    });

    return NextResponse.json({
      ...notification,
      suggestedAction: getNotificationSuggestedAction(notification),
      copyMessage: getNotificationCopyMessage(notification)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Notification was not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Notification could not be updated." }, { status: 500 });
  }
}
