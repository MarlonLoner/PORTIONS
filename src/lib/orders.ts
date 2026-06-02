import { OrderSource, OrderStatus } from "@prisma/client";

export const revenueCaptureStatuses: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.PHARMACIST_REVIEW,
  OrderStatus.QUOTED,
  OrderStatus.AWAITING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED
];

export const onlineOrderSources: OrderSource[] = [
  OrderSource.WHATSAPP,
  OrderSource.WEBSITE,
  OrderSource.APP,
  OrderSource.DIASPORA
];

export function isOrderToday(order: { createdAt: Date }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return order.createdAt >= today && order.createdAt < tomorrow;
}

export function isOnlineOrder(order: { source: OrderSource | string }) {
  return onlineOrderSources.includes(order.source as OrderSource);
}

export function isDelayedOrder(order: { status: OrderStatus | string; createdAt: Date }) {
  const ageHours = (Date.now() - order.createdAt.getTime()) / 3_600_000;

  return (
    order.status === OrderStatus.NEW ||
    order.status === OrderStatus.PHARMACIST_REVIEW ||
    order.status === OrderStatus.QUOTED ||
    order.status === OrderStatus.AWAITING_PAYMENT
  ) && ageHours >= 12;
}

export function orderRevenueUrgency(order: {
  status: OrderStatus | string;
  amount: number | string | { toString(): string };
  createdAt: Date;
  source: OrderSource | string;
}) {
  const amount = Number(order.amount);

  if (order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED) {
    return amount >= 100 ? "High value sale at payment risk" : "Payment conversion needed";
  }

  if (order.status === OrderStatus.PHARMACIST_REVIEW) {
    return "Clinical review blocking quote";
  }

  if (order.status === OrderStatus.PAID) {
    return "Revenue secured, fulfillment pending";
  }

  if (order.status === OrderStatus.PACKED || order.status === OrderStatus.DISPATCHED) {
    return "Protect delivery completion";
  }

  if (order.status === OrderStatus.CANCELLED) {
    return "Lost sale, review reason";
  }

  if (isDelayedOrder(order)) {
    return "Order delay risk";
  }

  return isOnlineOrder(order) ? "Digital sale in motion" : "Branch order in motion";
}

export function orderSuggestedAction(order: {
  status: OrderStatus | string;
  source: OrderSource | string;
  customerName: string;
  fulfillmentPreference: string;
}) {
  const firstName = order.customerName.split(" ")[0];

  if (order.status === OrderStatus.QUOTED || order.status === OrderStatus.AWAITING_PAYMENT) {
    return "This order has been quoted but payment has not been confirmed. Send payment reminder now to avoid losing the sale.";
  }

  if (order.status === OrderStatus.PHARMACIST_REVIEW) {
    return "Prescription is waiting for pharmacist review. Prioritize before the customer switches to another pharmacy.";
  }

  if (order.status === OrderStatus.PAID) {
    return "Customer paid. Pack and move to dispatch before end of day.";
  }

  if (order.status === OrderStatus.PACKED) {
    return `${firstName}'s order is packed. Confirm ${order.fulfillmentPreference.toLowerCase()} details and move to dispatch.`;
  }

  if (order.status === OrderStatus.DISPATCHED) {
    return "Confirm delivery completion and close the order while the customer is still reachable.";
  }

  if (order.status === OrderStatus.NEW) {
    return "Assign staff, verify medication need, and move the order into pharmacist review or quote quickly.";
  }

  if (order.status === OrderStatus.DELIVERED) {
    return "Order completed. Send receipt confirmation and check whether this should become a recurring refill.";
  }

  if (order.status === OrderStatus.CANCELLED) {
    return "Review cancellation reason and recover the customer if payment, stock, or response time caused the drop-off.";
  }

  return "Keep the order moving through the revenue pipeline and update the customer on WhatsApp.";
}

export function orderCustomerMessage(order: {
  status: OrderStatus | string;
  customerName: string;
  branch: { name: string };
  amount: number | string | { toString(): string };
  fulfillmentPreference: string;
}) {
  const firstName = order.customerName.split(" ")[0];

  if (order.status === OrderStatus.AWAITING_PAYMENT || order.status === OrderStatus.QUOTED) {
    return `Hi ${firstName}, this is PORTIONS ${order.branch.name}. Your order has been quoted and is awaiting payment confirmation. Once payment is confirmed, we can prepare it for ${order.fulfillmentPreference.toLowerCase()}.`;
  }

  if (order.status === OrderStatus.PHARMACIST_REVIEW) {
    return `Hi ${firstName}, your PORTIONS order is with our pharmacist for review. We will confirm the quote or next step shortly.`;
  }

  if (order.status === OrderStatus.PAID) {
    return `Hi ${firstName}, payment for your PORTIONS order has been received. Our team is packing it now and will update you before dispatch or collection.`;
  }

  if (order.status === OrderStatus.PACKED) {
    return `Hi ${firstName}, your PORTIONS order is packed. Please confirm your ${order.fulfillmentPreference.toLowerCase()} details so we can complete the handover.`;
  }

  if (order.status === OrderStatus.DISPATCHED) {
    return `Hi ${firstName}, your PORTIONS order has been dispatched. Please confirm once received so we can close the order.`;
  }

  if (order.status === OrderStatus.DELIVERED) {
    return `Hi ${firstName}, your PORTIONS order has been completed. Thank you. Let us know if you would like us to schedule your next refill reminder.`;
  }

  return `Hi ${firstName}, this is PORTIONS ${order.branch.name}. We are processing your order and will update you as soon as the next step is ready.`;
}
