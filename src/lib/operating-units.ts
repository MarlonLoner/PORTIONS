import { OrderSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function normalizeOperatingUnitPhone(value?: string | null) {
  if (!value) return "";
  const cleaned = value.replace(/[\s()\-]/g, "").replace(/^\+/, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("263")) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length >= 10) return `263${cleaned.slice(1)}`;
  return cleaned;
}

export async function getOperatingUnitWhatsAppNumber(operatingUnitId?: string | null) {
  if (!operatingUnitId) return "";
  const unit = await prisma.operatingUnit.findUnique({ where: { id: operatingUnitId } });
  return normalizeOperatingUnitPhone(unit?.whatsappNumber);
}

export async function getPrimaryOnlineUnit() {
  return prisma.operatingUnit.findFirst({
    where: { isPrimaryOnlineUnit: true, status: "ACTIVE" },
    orderBy: { name: "asc" }
  });
}

export async function getBranchOperatingUnit(branchId?: string | null) {
  if (!branchId) return null;
  return prisma.operatingUnit.findFirst({
    where: { branchId, type: "PHYSICAL_BRANCH", status: "ACTIVE" },
    orderBy: { name: "asc" }
  });
}

export async function getCommunicationSendingUnit(input: {
  sourceType?: string | null;
  branchId?: string | null;
  orderSource?: OrderSource | string | null;
  eventOwnerUnitId?: string | null;
}) {
  if (input.sourceType === "ORDER" && input.orderSource && input.orderSource !== OrderSource.WALK_IN) {
    return getPrimaryOnlineUnit();
  }
  if (input.sourceType === "EVENT" && input.eventOwnerUnitId) {
    return prisma.operatingUnit.findUnique({ where: { id: input.eventOwnerUnitId } });
  }
  const branchUnit = await getBranchOperatingUnit(input.branchId);
  return branchUnit ?? await getPrimaryOnlineUnit();
}

export async function getDefaultWhatsAppForOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { originatingOperatingUnit: true, branch: true } });
  if (!order) return { number: "", label: "Order WhatsApp not configured", operatingUnitId: null };
  const unit = order.source === OrderSource.WALK_IN ? await getBranchOperatingUnit(order.branchId) : order.originatingOperatingUnit ?? await getPrimaryOnlineUnit();
  return {
    number: normalizeOperatingUnitPhone(unit?.whatsappNumber),
    label: unit?.contactLabel ?? unit?.name ?? "Order WhatsApp not configured",
    operatingUnitId: unit?.id ?? null
  };
}

export async function getDefaultWhatsAppForPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  const unit = await getBranchOperatingUnit(patient?.branchId);
  return {
    number: normalizeOperatingUnitPhone(unit?.whatsappNumber),
    label: unit?.contactLabel ?? unit?.name ?? "Branch WhatsApp not configured",
    operatingUnitId: unit?.id ?? null
  };
}

export async function getDefaultWhatsAppForEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { communicationOperatingUnit: true } });
  const branchUnit = await getBranchOperatingUnit(event?.branchId);
  const unit = event?.communicationOperatingUnit ?? branchUnit ?? await getPrimaryOnlineUnit();
  return {
    number: normalizeOperatingUnitPhone(unit?.whatsappNumber),
    label: unit?.contactLabel ?? unit?.name ?? "Event WhatsApp not configured",
    operatingUnitId: unit?.id ?? null
  };
}

export async function getOrderOriginUnit(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { originatingOperatingUnit: true } });
  return order?.originatingOperatingUnit ?? null;
}

export async function getOrderFulfillmentBranch(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { fulfillmentBranch: true, branch: true } });
  return order?.fulfillmentBranch ?? order?.branch ?? null;
}

export async function getOrderOwningTeam(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { assignedOperatingUnit: true } });
  return order?.assignedOperatingUnit ?? null;
}

export async function getOrderDefaultCommunicationNumber(orderId: string) {
  return getDefaultWhatsAppForOrder(orderId);
}

export async function getOnlineOrderMetrics() {
  const onlineUnit = await getPrimaryOnlineUnit();
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { originatingOperatingUnitId: onlineUnit?.id },
        { source: { in: [OrderSource.WHATSAPP, OrderSource.WEBSITE, OrderSource.APP, OrderSource.DIASPORA] } }
      ]
    }
  });
  return {
    onlineUnit,
    totalOnlineOrders: orders.length,
    awaitingPayment: orders.filter((order) => order.status === "AWAITING_PAYMENT").length,
    awaitingFulfillmentBranch: orders.filter((order) => !order.fulfillmentBranchId).length,
    completedOnlineOrders: orders.filter((order) => order.status === "DELIVERED").length
  };
}
