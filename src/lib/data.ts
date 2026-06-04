import {
  FollowUpStatus,
  FollowUpType,
  OrderSource,
  OrderStatus,
  OrderType,
  PackageType,
  PatientStatus,
  Prisma,
  RiskScore,
  StockStatus
} from "@prisma/client";
import { buildBranchCommand } from "@/lib/branches";
import { prisma } from "@/lib/prisma";
import {
  calculateTotalStockValue,
  calculateEstimatedStockValue,
  getChronicDemandRisk,
  getDeadStockItems,
  getLowStockItems,
  getNearExpiryItems,
  getOverstockItems,
  getReorderUrgency,
  getStockRiskLevel,
  getStockAiSummary,
  getSuggestedTransfers
} from "@/lib/stock";

export const patientStatusOptions = Object.values(PatientStatus);
export const packageTypeOptions = Object.values(PackageType);
export const riskScoreOptions = Object.values(RiskScore);
export const followUpTypeOptions = Object.values(FollowUpType);
export const orderStatusOptions = Object.values(OrderStatus);
export const orderSourceOptions = Object.values(OrderSource);
export const orderTypeOptions = Object.values(OrderType);
export const stockStatusOptions = Object.values(StockStatus);

const paidStatuses = new Set<OrderStatus>([
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED
]);

const pendingOrderStatuses = new Set<OrderStatus>([
  OrderStatus.NEW,
  OrderStatus.PHARMACIST_REVIEW,
  OrderStatus.QUOTED,
  OrderStatus.AWAITING_PAYMENT
]);

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function isToday(date: Date) {
  return date >= startOfToday() && date < endOfToday();
}

function sumMoney<T>(items: T[], selector: (item: T) => Prisma.Decimal | number) {
  return items.reduce((sum, item) => sum + Number(selector(item)), 0);
}

type BranchMetricsInput = Prisma.BranchGetPayload<{
  include: {
    orders: true;
    patients: true;
    followUpTasks: true;
    stockItems: true;
  };
}>;

function branchMetrics(branch: BranchMetricsInput) {
  const todaysOrders = branch.orders.filter((order) => isToday(order.createdAt));
  const onlineOrders = todaysOrders.filter((order) => order.source !== OrderSource.WALK_IN);
  const paidOnlineOrders = onlineOrders.filter((order) => paidStatuses.has(order.status));
  const conversionRate = onlineOrders.length ? (paidOnlineOrders.length / onlineOrders.length) * 100 : 0;

  return {
    id: branch.id,
    name: branch.name,
    area: branch.area,
    revenueToday: sumMoney(todaysOrders, (order) => order.amount),
    ordersToday: todaysOrders.length,
    conversionRate,
    chronicDue: branch.patients.filter((patient) => isToday(patient.nextRefillDate)).length,
    overdueFollowUps: branch.followUpTasks.filter((task) => task.status === FollowUpStatus.PENDING && task.dueDate < startOfToday()).length,
    pendingOrders: branch.orders.filter((order) => pendingOrderStatuses.has(order.status)).length,
    stockAlerts: branch.stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length,
    staffResponseScore: branch.staffResponseScore
  };
}

export async function getDashboardData() {
  const [branches, orders, patients, followUps, stockItems] = await Promise.all([
    prisma.branch.findMany({
      include: {
        orders: true,
        patients: true,
        followUpTasks: true,
        stockItems: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.order.findMany({ include: { branch: true }, orderBy: { createdAt: "desc" } }),
    prisma.patient.findMany({ include: { branch: true } }),
    prisma.followUpTask.findMany({ include: { branch: true }, orderBy: { dueDate: "asc" } }),
    prisma.stockItem.findMany({ include: { branch: true } })
  ]);

  const todaysOrders = orders.filter((order) => isToday(order.createdAt));
  const onlineOrders = todaysOrders.filter((order) => order.source !== OrderSource.WALK_IN);
  const paidOnlineOrders = onlineOrders.filter((order) => paidStatuses.has(order.status));
  const branchCards = branches.map(branchMetrics);
  const bestBranch = [...branchCards].sort((a, b) => b.revenueToday - a.revenueToday)[0];
  const branchNeedingAttention = [...branchCards].sort((a, b) => {
    const aScore = a.overdueFollowUps * 3 + a.stockAlerts * 2 + a.pendingOrders;
    const bScore = b.overdueFollowUps * 3 + b.stockAlerts * 2 + b.pendingOrders;
    return bScore - aScore;
  })[0];

  return {
    totalRevenueToday: sumMoney(todaysOrders, (order) => order.amount),
    onlineSalesRevenue: sumMoney(onlineOrders, (order) => order.amount),
    ordersToday: todaysOrders.length,
    conversionRate: onlineOrders.length ? (paidOnlineOrders.length / onlineOrders.length) * 100 : 0,
    chronicDueToday: patients.filter((patient) => isToday(patient.nextRefillDate)).length,
    overdueRefillPatients: patients.filter((patient) => patient.status === PatientStatus.OVERDUE || patient.nextRefillDate < startOfToday()).length,
    pendingPharmacistReviews: orders.filter((order) => order.status === OrderStatus.PHARMACIST_REVIEW).length,
    bestBranch: bestBranch?.name ?? "No branch data",
    branchNeedingAttention: branchNeedingAttention?.name ?? "No branch data",
    revenueByBranch: branchCards.map((branch) => ({
      id: branch.id,
      name: branch.name,
      revenue: branch.revenueToday,
      orders: branch.ordersToday
    })),
    followUpUrgency: followUpTypeOptions.map((type) => ({
      type,
      count: followUps.filter((task) => task.type === type && task.status === FollowUpStatus.PENDING).length
    })),
    orderPipeline: orderStatusOptions.map((status) => ({
      status,
      count: orders.filter((order) => order.status === status).length
    })),
    stockAlertCount: stockItems.filter((item) => item.status !== StockStatus.HEALTHY).length
  };
}

export async function getPatientList(filters: {
  status?: string;
  branchId?: string;
  packageType?: string;
  riskScore?: string;
}) {
  const where: Prisma.PatientWhereInput = {};

  if (filters.status) where.status = filters.status as PatientStatus;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.packageType) where.packageType = filters.packageType as PackageType;
  if (filters.riskScore) where.riskScore = filters.riskScore as RiskScore;

  const [patients, allPatients, branches] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        branch: true,
        assignedStaff: true,
        refillEvents: true,
        followUpTasks: true
      },
      orderBy: [{ status: "desc" }, { nextRefillDate: "asc" }]
    }),
    prisma.patient.findMany({
      include: {
        branch: true,
        assignedStaff: true,
        refillEvents: true,
        followUpTasks: true
      },
      orderBy: [{ status: "desc" }, { nextRefillDate: "asc" }]
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } })
  ]);

  return { patients, allPatients, branches };
}

export async function getPatientDetail(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      branch: true,
      assignedStaff: true,
      medications: { orderBy: { name: "asc" } },
      refillEvents: {
        include: { branch: true, handledBy: true },
        orderBy: { refillDate: "desc" }
      },
      followUpTasks: {
        include: { branch: true, assignedStaff: true },
        orderBy: { dueDate: "desc" }
      },
      orders: {
        include: { branch: true, assignedStaff: true },
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });
}

export async function getFollowUps() {
  return prisma.followUpTask.findMany({
    where: { status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SNOOZED] } },
    include: {
      branch: true,
      patient: {
        include: {
          refillEvents: true
        }
      },
      assignedStaff: true
    },
    orderBy: [{ dueDate: "asc" }, { type: "asc" }]
  });
}

export async function getFollowUpQueueData() {
  const tasks = await prisma.followUpTask.findMany({
    include: {
      branch: true,
      patient: {
        include: {
          refillEvents: true
        }
      },
      assignedStaff: true
    },
    orderBy: [{ dueDate: "asc" }, { type: "asc" }]
  });

  const weekStart = startOfToday();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  return {
    tasks: tasks.filter((task) => task.status !== FollowUpStatus.DONE),
    allTasks: tasks,
    completedThisWeek: tasks.filter((task) => task.status === FollowUpStatus.DONE && task.updatedAt >= weekStart).length
  };
}

export async function getOrders(filters: {
  status?: string;
  source?: string;
  branchId?: string;
  type?: string;
} = {}) {
  const where: Prisma.OrderWhereInput = {};

  if (filters.status) where.status = filters.status as OrderStatus;
  if (filters.source) where.source = filters.source as OrderSource;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.type) where.type = filters.type as OrderType;

  const [orders, allOrders, branches] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        branch: true,
        assignedStaff: true,
        items: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.findMany({
      include: {
        branch: true,
        assignedStaff: true,
        items: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.branch.findMany({ orderBy: { name: "asc" } })
  ]);

  return { orders, allOrders, branches };
}

export async function getOrderDetail(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      branch: true,
      assignedStaff: true,
      patient: true,
      items: true
    }
  });
}

export async function getBranchOverview() {
  const branches = await prisma.branch.findMany({
    include: {
      orders: true,
      patients: true,
      followUpTasks: true,
      stockItems: true
    },
    orderBy: { name: "asc" }
  });

  return branches.map(buildBranchCommand);
}

export async function getBranchDetail(id: string) {
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      orders: {
        include: { assignedStaff: true },
        orderBy: { createdAt: "desc" }
      },
      patients: true,
      followUpTasks: true,
      stockItems: true,
      staffMembers: true
    }
  });

  if (!branch) return null;

  const metrics = buildBranchCommand(branch);
  const categoryRevenue = branch.orders.reduce<Record<string, number>>((result, order) => {
    const label = order.type;
    result[label] = (result[label] ?? 0) + Number(order.amount);
    return result;
  }, {});

  return {
    branch,
    metrics,
    categoryRevenue: Object.entries(categoryRevenue).map(([category, revenue]) => ({ category, revenue })),
    followUpCompletion:
      branch.followUpTasks.length > 0
        ? (branch.followUpTasks.filter((task) => task.status === FollowUpStatus.DONE).length / branch.followUpTasks.length) * 100
        : 0,
    onlineOrders: branch.orders.filter((order) => order.source !== OrderSource.WALK_IN),
    stockIssues: branch.stockItems.filter((item) => item.status !== StockStatus.HEALTHY),
    ordersByStatus: Object.values(OrderStatus).map((status) => ({
      status,
      count: branch.orders.filter((order) => order.status === status).length,
      value: branch.orders.filter((order) => order.status === status).reduce((sum, order) => sum + Number(order.amount), 0)
    })),
    patientsDueToday: branch.patients.filter((patient) => patient.nextRefillDate >= startOfToday() && patient.nextRefillDate < endOfToday()),
    overduePatients: branch.patients.filter((patient) => patient.status === PatientStatus.OVERDUE || patient.nextRefillDate < startOfToday()),
    highRiskPatients: branch.patients.filter((patient) => patient.riskScore === RiskScore.HIGH),
    lowStockItems: branch.stockItems.filter((item) => item.status === StockStatus.LOW_STOCK),
    nearExpiryItems: branch.stockItems.filter((item) => item.status === StockStatus.NEAR_EXPIRY)
  };
}

export async function getStockData(filters: {
  branchId?: string;
  category?: string;
  status?: string;
  expiryRisk?: string;
} = {}) {
  const where: Prisma.StockItemWhereInput = {};

  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status as StockStatus;

  const [stockItemsRaw, allStockItemsRaw, patients, branches] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      include: { branch: true },
      orderBy: [{ status: "asc" }, { productName: "asc" }]
    }),
    prisma.stockItem.findMany({
      include: { branch: true },
      orderBy: [{ status: "asc" }, { productName: "asc" }]
    }),
    prisma.patient.findMany({ include: { branch: true } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } })
  ]);

  const expiryFilteredStockItems =
    filters.expiryRisk === "near"
      ? stockItemsRaw.filter((item) => item.expiryDate && item.expiryDate.getTime() - Date.now() <= 60 * 86_400_000)
      : filters.expiryRisk === "expired"
        ? stockItemsRaw.filter((item) => item.expiryDate && item.expiryDate.getTime() < Date.now())
        : stockItemsRaw;
  const stockItems = expiryFilteredStockItems.map((item) => ({
    ...item,
    estimatedStockValue: calculateEstimatedStockValue(item),
    riskLevel: getStockRiskLevel(item)
  }));
  const allStockItems = allStockItemsRaw.map((item) => ({
    ...item,
    estimatedStockValue: calculateEstimatedStockValue(item),
    riskLevel: getStockRiskLevel(item)
  }));
  const categories = Array.from(new Set(allStockItemsRaw.map((item) => item.category))).sort();
  const lowStockItems = getLowStockItems(allStockItemsRaw);
  const nearExpiryItems = getNearExpiryItems(allStockItemsRaw);
  const overstockItems = getOverstockItems(allStockItemsRaw);
  const deadStockItems = getDeadStockItems(allStockItemsRaw);
  const chronicDemandRisk = getChronicDemandRisk(allStockItemsRaw, patients);
  const suggestedTransfers = getSuggestedTransfers(allStockItemsRaw);

  return {
    stockItems,
    allStockItems,
    branches,
    categories,
    lowStockItems,
    nearExpiryItems,
    overstockItems,
    deadStockItems,
    chronicDemandRisk,
    suggestedTransfers,
    aiSummaries: getStockAiSummary(allStockItemsRaw, patients),
    smartCards: {
      totalStockValue: calculateTotalStockValue(allStockItemsRaw),
      lowStockRisks: lowStockItems.length,
      nearExpiryValue: nearExpiryItems.reduce((sum, item) => sum + Number(item.valueAtRisk), 0),
      overstockItems: overstockItems.length,
      deadStockItems: deadStockItems.length,
      chronicDemandForecast: patients.filter((patient) => patient.nextRefillDate >= startOfToday() && patient.nextRefillDate < new Date(Date.now() + 7 * 86_400_000)).length,
      chronicDemandRisk: chronicDemandRisk.length,
      suggestedBranchTransfers: suggestedTransfers.length,
      reorderUrgency: getReorderUrgency(allStockItemsRaw)
    }
  };
}

export async function getAiBriefData() {
  const [dashboard, branches, stock, orders, patients, followUps, rawBranches, stockItems] = await Promise.all([
    getDashboardData(),
    getBranchOverview(),
    getStockData(),
    prisma.order.findMany({ include: { branch: true }, orderBy: { createdAt: "desc" } }),
    prisma.patient.findMany({ include: { branch: true, refillEvents: true } }),
    prisma.followUpTask.findMany({ include: { branch: true, assignedStaff: true }, orderBy: { dueDate: "asc" } }),
    prisma.branch.findMany({
      include: {
        orders: true,
        patients: true,
        followUpTasks: true,
        stockItems: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.stockItem.findMany({ include: { branch: true }, orderBy: [{ status: "asc" }, { productName: "asc" }] })
  ]);

  return { dashboard, branches, stock, orders, patients, followUps, rawBranches, stockItems };
}

export async function getReports() {
  return prisma.report.findMany({ orderBy: { lastGeneratedAt: "desc" } });
}

export async function getReportsData() {
  const [reports, dashboard, branches, stock, orders, patients, followUps] = await Promise.all([
    getReports(),
    getDashboardData(),
    getBranchOverview(),
    getStockData(),
    prisma.order.findMany({ include: { branch: true, assignedStaff: true }, orderBy: { createdAt: "desc" } }),
    prisma.patient.findMany({ include: { branch: true, refillEvents: true }, orderBy: { nextRefillDate: "asc" } }),
    prisma.followUpTask.findMany({ include: { branch: true, assignedStaff: true }, orderBy: { dueDate: "asc" } })
  ]);

  return { reports, dashboard, branches, stock, orders, patients, followUps };
}

export async function getSettingsData() {
  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({
      include: {
        staffMembers: true,
        patients: true,
        orders: true,
        stockItems: true,
        followUpTasks: true
      },
      orderBy: { name: "asc" }
    }),
    prisma.staffMember.findMany({
      include: {
        branch: true,
        patients: true,
        followUpTasks: true,
        orders: true
      },
      orderBy: { name: "asc" }
    })
  ]);

  return {
    pharmacyName: "PORTIONS Demo Pharmacy Group",
    branches,
    staff,
    packageTypes: packageTypeOptions,
    notificationChannels: ["WhatsApp", "SMS", "Email", "Manager daily digest"],
    importSettings: ["Patient CSV import", "Stock CSV import", "Order import mapping"],
    branding: ["Deep navy sidebar", "Clinical blue highlights", "Emerald success accents"]
  };
}

export async function getDemoData() {
  const [dashboard, branches, stock, orders, patients, followUps] = await Promise.all([
    getDashboardData(),
    getBranchOverview(),
    getStockData(),
    prisma.order.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.patient.findMany({ orderBy: { nextRefillDate: "asc" } }),
    prisma.followUpTask.findMany({ orderBy: { dueDate: "asc" } })
  ]);

  return { dashboard, branches, stock, orders, patients, followUps };
}

export async function getPilotRequestsData() {
  return prisma.pilotRequest.findMany({
    orderBy: { createdAt: "desc" }
  });
}

export async function getImportBatchesData() {
  return prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" }
  });
}
