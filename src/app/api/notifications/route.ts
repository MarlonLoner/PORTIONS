import { NextResponse } from "next/server";
import { getNotificationCopyMessage, getNotificationInbox, getNotificationSuggestedAction, reconcileNotifications } from "@/lib/notifications";

export async function GET() {
  try {
    await reconcileNotifications();
    const notifications = await getNotificationInbox();
    return NextResponse.json(notifications.map((notification) => ({
      ...notification,
      suggestedAction: getNotificationSuggestedAction(notification),
      copyMessage: getNotificationCopyMessage(notification)
    })));
  } catch {
    return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 500 });
  }
}
