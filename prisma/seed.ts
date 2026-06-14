import {
  CommunicationChannel,
  CommunicationOutcomeType,
  CommunicationRecipientType,
  CommunicationStatus,
  FollowUpStatus,
  FollowUpType,
  FollowUpOutcomeType,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationRecipientType,
  NotificationSeverity,
  NotificationStatus,
  NotificationType,
  OperatingUnitAccessLevel,
  OperatingUnitStatus,
  OperatingUnitType,
  OperationalActionCategory,
  OperationalActionOutcome,
  OperationalActionPriority,
  OperationalActionStatus,
  OrderSource,
  OrderStatus,
  OrderType,
  PackageType,
  PatientStatus,
  PrismaClient,
  ReportType,
  RiskScore,
  StockStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import type { Branch, OperatingUnit, Patient, StaffMember } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

const today = new Date();
today.setHours(9, 0, 0, 0);

function addDays(days: number) {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date;
}

function money(amount: number) {
  return amount.toFixed(2);
}

function seedPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function operatingUnitCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const branchSeeds = [
  { name: "Avondale", area: "Harare North", managerName: "Tariro Moyo", revenueTarget: "5200.00", staffResponseScore: 94 },
  { name: "Borrowdale", area: "Borrowdale Village", managerName: "Farai Ndlovu", revenueTarget: "6100.00", staffResponseScore: 96 },
  { name: "CBD", area: "Harare CBD", managerName: "Rudo Chigwedere", revenueTarget: "4800.00", staffResponseScore: 88 },
  { name: "Eastlea", area: "Eastlea", managerName: "Nyasha Dube", revenueTarget: "3900.00", staffResponseScore: 84 },
  { name: "Chitungwiza", area: "Chitungwiza", managerName: "Blessing Zhou", revenueTarget: "3600.00", staffResponseScore: 79 }
];

const staffSeeds = [
  { name: "Tendai Mutsvairo", role: "Lead Pharmacist", phone: "+263 77 100 1130", email: "tendai@portions.co.zw", branch: "Avondale" },
  { name: "Munashe Sibanda", role: "Pharmacist", phone: "+263 78 421 9012", email: "munashe@portions.co.zw", branch: "Borrowdale" },
  { name: "Chipo Gumbo", role: "Follow-up Lead", phone: "+263 71 880 4240", email: "chipo@portions.co.zw", branch: "CBD" },
  { name: "Kudzai Marange", role: "Dispensary Manager", phone: "+263 77 345 0021", email: "kudzai@portions.co.zw", branch: "Eastlea" },
  { name: "Lindiwe Ncube", role: "Customer Success", phone: "+263 73 590 8820", email: "lindiwe@portions.co.zw", branch: "Chitungwiza" },
  { name: "Simbarashe Zimuto", role: "Online Orders", phone: "+263 78 905 1003", email: "simba@portions.co.zw", branch: "Avondale" },
  { name: "Rutendo Matema", role: "Stock Controller", phone: "+263 71 234 8811", email: "rutendo@portions.co.zw", branch: "CBD" },
  { name: "Michael Chari", role: "Branch Coach", phone: "+263 77 910 2201", email: "michael@portions.co.zw", branch: "Borrowdale" }
];

const paidOrderStatuses: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PACKED,
  OrderStatus.DISPATCHED,
  OrderStatus.DELIVERED
];

const patientNames = [
  "Memory Mutasa",
  "Brian Mupfumi",
  "Paidamoyo Nyoni",
  "Elijah Chikore",
  "Nyaradzo Mlambo",
  "Tawanda Chirenje",
  "Kundai Makoni",
  "Ropafadzo Hove",
  "Grace Sithole",
  "Admire Maposa",
  "Anesu Gwatidzo",
  "Vimbai Moyo",
  "Tatenda Manyika",
  "Elizabeth Chitiyo",
  "Lloyd Mandizha",
  "Fadzai Mhaka",
  "Shingirai Ncube",
  "Naomi Chikwiri",
  "Prosper Rukuni",
  "Tsitsi Masunda",
  "Lovemore Dzingai",
  "Melissa Nyakudya",
  "Blessing Katsande",
  "Thandiwe Sibanda",
  "Walter Goredema",
  "Nyasha Machingura",
  "Clive Jonga",
  "Primrose Dube",
  "Edith Mazarura",
  "Panashe Mandaza"
];

const conditionCategories = [
  "Hypertension",
  "Diabetes",
  "Asthma",
  "HIV Care",
  "Pain Management",
  "Supplements"
];

const packageTypes = [
  PackageType.STANDARD,
  PackageType.PREMIUM,
  PackageType.FAMILY_PACK,
  PackageType.CHRONIC_PLUS,
  PackageType.CORPORATE
];

const patientStatuses = [
  PatientStatus.ACTIVE,
  PatientStatus.DUE_SOON,
  PatientStatus.OVERDUE,
  PatientStatus.ACTIVE,
  PatientStatus.VIP,
  PatientStatus.LOST
];

const riskScores = [RiskScore.LOW, RiskScore.MEDIUM, RiskScore.HIGH, RiskScore.LOW, RiskScore.MEDIUM];

const medicationByCondition: Record<string, Array<{ name: string; dosage: string; frequency: string }>> = {
  Hypertension: [
    { name: "Amlodipine", dosage: "5mg", frequency: "Once daily" },
    { name: "Losartan", dosage: "50mg", frequency: "Once daily" }
  ],
  Diabetes: [
    { name: "Metformin", dosage: "500mg", frequency: "Twice daily" },
    { name: "Gliclazide", dosage: "30mg", frequency: "Morning" }
  ],
  Asthma: [
    { name: "Salbutamol Inhaler", dosage: "100mcg", frequency: "As needed" },
    { name: "Budesonide Inhaler", dosage: "200mcg", frequency: "Twice daily" }
  ],
  "HIV Care": [
    { name: "TLD", dosage: "300/300/50mg", frequency: "Once daily" },
    { name: "Cotrimoxazole", dosage: "960mg", frequency: "Once daily" }
  ],
  "Pain Management": [
    { name: "Paracetamol", dosage: "500mg", frequency: "As needed" },
    { name: "Diclofenac Gel", dosage: "1%", frequency: "Twice daily" }
  ],
  Supplements: [
    { name: "Vitamin D3", dosage: "1000IU", frequency: "Once daily" },
    { name: "Omega 3", dosage: "1000mg", frequency: "Once daily" }
  ]
};

const followUpTypes = [
  FollowUpType.DUE_TODAY,
  FollowUpType.OVERDUE,
  FollowUpType.PRESCRIPTION_RENEWAL_NEEDED,
  FollowUpType.PAYMENT_PENDING,
  FollowUpType.DELIVERY_CONFIRMATION,
  FollowUpType.LOST_PATIENT_REVIVAL
];

const stockProducts = [
  { name: "Amlodipine 5mg", category: "Hypertension", reorder: 40 },
  { name: "Losartan 50mg", category: "Hypertension", reorder: 35 },
  { name: "Metformin 500mg", category: "Diabetes", reorder: 60 },
  { name: "Gliclazide MR 30mg", category: "Diabetes", reorder: 30 },
  { name: "Salbutamol Inhaler", category: "Asthma", reorder: 24 },
  { name: "Budesonide Inhaler", category: "Asthma", reorder: 18 },
  { name: "TLD 30 Day Pack", category: "HIV Care", reorder: 45 },
  { name: "Coartem 24", category: "Antibiotics", reorder: 28 },
  { name: "Vitamin C 1000mg", category: "Supplements", reorder: 36 },
  { name: "SPF 50 Sunscreen", category: "Skincare", reorder: 20 },
  { name: "Baby Formula Stage 2", category: "Baby Care", reorder: 16 },
  { name: "Paracetamol 500mg", category: "Pain Management", reorder: 75 }
];

async function main() {
  await prisma.appSession.deleteMany();
  await prisma.userOperatingUnitAccess.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.communicationActivity.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.operationalActionActivity.deleteMany();
  await prisma.operationalAction.deleteMany();
  await prisma.report.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.followUpTaskActivity.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.refillEvent.deleteMany();
  await prisma.patientMedication.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.operatingUnit.deleteMany();
  await prisma.staffMember.deleteMany();
  await prisma.branch.deleteMany();

  const branches = new Map<string, Branch>();
  for (const branch of branchSeeds) {
    const created = await prisma.branch.create({ data: branch });
    branches.set(created.name, created);
  }

  const staff: StaffMember[] = [];
  for (const member of staffSeeds) {
    const branch = branches.get(member.branch);
    if (!branch) throw new Error(`Missing branch ${member.branch}`);
    staff.push(
      await prisma.staffMember.create({
        data: {
          name: member.name,
          role: member.role,
          phone: member.phone,
          email: member.email,
          branchId: branch.id
        }
      })
    );
  }

  const branchOperatingUnits = new Map<string, OperatingUnit>();
  for (const [index, branch] of Array.from(branches.values()).entries()) {
    const created = await prisma.operatingUnit.create({
      data: {
        name: `${branch.name} Branch`,
        code: `${operatingUnitCode(branch.name)}_BRANCH`,
        type: OperatingUnitType.PHYSICAL_BRANCH,
        status: OperatingUnitStatus.ACTIVE,
        branchId: branch.id,
        location: branch.area,
        phone: `+263 77 000 ${String(1100 + index)}`,
        whatsappNumber: `+263 77 000 ${String(1100 + index)}`,
        contactLabel: `${branch.name} Branch WhatsApp`,
        managerStaffId: staff.find((member) => member.branchId === branch.id && /manager|lead|coach|pharmacist/i.test(member.role))?.id ?? null,
        handlesOnlineOrders: true,
        handlesPatientFollowUps: true,
        handlesStock: true,
        handlesEvents: true,
        handlesCommunications: true
      }
    });
    branchOperatingUnits.set(branch.id, created);
  }

  const onlineUnit = await prisma.operatingUnit.create({
    data: {
      name: "Online Department",
      code: "ONLINE_DEPARTMENT",
      type: OperatingUnitType.ONLINE_DEPARTMENT,
      status: OperatingUnitStatus.ACTIVE,
      location: "Central WhatsApp and web order desk",
      phone: "+263 77 000 1200",
      whatsappNumber: "+263 77 000 1200",
      contactLabel: "PORTIONS Online Orders",
      isPrimaryOnlineUnit: true,
      handlesOnlineOrders: true,
      handlesPatientFollowUps: false,
      handlesStock: false,
      handlesEvents: false,
      handlesCommunications: true
    }
  });

  const headOfficeUnit = await prisma.operatingUnit.create({
    data: {
      name: "Head Office",
      code: "HEAD_OFFICE",
      type: OperatingUnitType.HEAD_OFFICE,
      status: OperatingUnitStatus.ACTIVE,
      location: "Executive command office",
      phone: "+263 77 000 1300",
      whatsappNumber: "+263 77 000 1300",
      contactLabel: "PORTIONS Head Office",
      handlesOnlineOrders: false,
      handlesPatientFollowUps: false,
      handlesStock: false,
      handlesEvents: true,
      handlesCommunications: true
    }
  });

  const financeUnit = await prisma.operatingUnit.create({
    data: {
      name: "Finance",
      code: "FINANCE",
      type: OperatingUnitType.FINANCE,
      status: OperatingUnitStatus.ACTIVE,
      location: "Finance and approvals",
      phone: "+263 77 000 1400",
      whatsappNumber: "+263 77 000 1400",
      contactLabel: "PORTIONS Finance",
      handlesOnlineOrders: false,
      handlesPatientFollowUps: false,
      handlesStock: false,
      handlesEvents: false,
      handlesCommunications: true
    }
  });

  const demoPassword = process.env.SEED_USER_PASSWORD || process.env.DEMO_USER_PASSWORD || "PORTIONS-DEMO-2026!";
  const passwordHash = seedPasswordHash(demoPassword);
  const allUnits = [...branchOperatingUnits.values(), onlineUnit, headOfficeUnit, financeUnit];
  const primaryStaff = staff[0];
  const ownerUser = await prisma.appUser.create({
    data: {
      name: "PORTIONS Owner Demo",
      email: "owner@portions.co.zw",
      passwordHash,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      staffMemberId: primaryStaff?.id,
      primaryOperatingUnitId: headOfficeUnit.id,
      unitAccess: {
        create: allUnits.map((unit) => ({
          operatingUnitId: unit.id,
          accessLevel: OperatingUnitAccessLevel.ADMIN,
          isPrimary: unit.id === headOfficeUnit.id
        }))
      }
    }
  });

  await prisma.appUser.createMany({
    data: [
      {
        name: "General Manager",
        email: "gm@portions.co.zw",
        passwordHash,
        role: UserRole.GENERAL_MANAGER,
        status: UserStatus.ACTIVE,
        primaryOperatingUnitId: headOfficeUnit.id
      },
      {
        name: "Online Orders Lead",
        email: "online@portions.co.zw",
        passwordHash,
        role: UserRole.ONLINE_ORDERS_AGENT,
        status: UserStatus.ACTIVE,
        primaryOperatingUnitId: onlineUnit.id
      },
      {
        name: "Finance Admin",
        email: "finance@portions.co.zw",
        passwordHash,
        role: UserRole.FINANCE_ADMIN,
        status: UserStatus.ACTIVE,
        primaryOperatingUnitId: financeUnit.id
      },
      {
        name: "Readonly Board Viewer",
        email: "viewer@portions.co.zw",
        passwordHash,
        role: UserRole.VIEW_ONLY,
        status: UserStatus.ACTIVE,
        primaryOperatingUnitId: headOfficeUnit.id
      }
    ]
  });

  const createdUsers = await prisma.appUser.findMany();
  const accessRows = createdUsers
    .filter((user) => user.id !== ownerUser.id)
    .flatMap((user) => {
      const unitIds =
        user.role === UserRole.ONLINE_ORDERS_AGENT ? [onlineUnit.id] :
        user.role === UserRole.FINANCE_ADMIN ? [financeUnit.id, headOfficeUnit.id] :
        allUnits.map((unit) => unit.id);
      return unitIds.map((operatingUnitId) => ({
        userId: user.id,
        operatingUnitId,
        accessLevel: user.role === UserRole.VIEW_ONLY ? OperatingUnitAccessLevel.VIEW : OperatingUnitAccessLevel.MANAGE,
        isPrimary: operatingUnitId === user.primaryOperatingUnitId
      }));
    });
  if (accessRows.length) await prisma.userOperatingUnitAccess.createMany({ data: accessRows, skipDuplicates: true });

  const branchList = Array.from(branches.values());
  const patients: Patient[] = [];

  for (let index = 0; index < patientNames.length; index += 1) {
    const branch = branchList[index % branchList.length];
    const assignedStaff = staff[index % staff.length];
    const conditionCategory = conditionCategories[index % conditionCategories.length];
    const status = patientStatuses[index % patientStatuses.length];
    const dateOffset = status === PatientStatus.OVERDUE ? -((index % 5) + 1) : status === PatientStatus.DUE_SOON ? index % 2 : (index % 14) + 1;

    const patient = await prisma.patient.create({
      data: {
        name: patientNames[index],
        phone: `+263 7${index % 2 === 0 ? "7" : "1"} ${String(140 + index).padStart(3, "0")} ${String(2300 + index * 17).padStart(4, "0")}`,
        branchId: branch.id,
        conditionCategory,
        packageType: packageTypes[index % packageTypes.length],
        medicationCycle: index % 3 === 0 ? "28 days" : index % 3 === 1 ? "30 days" : "60 days",
        nextRefillDate: addDays(dateOffset),
        status,
        assignedStaffId: assignedStaff.id,
        lastContactedAt: addDays(-((index % 9) + 1)),
        riskScore: riskScores[index % riskScores.length]
      }
    });

    patients.push(patient);

    const meds = medicationByCondition[conditionCategory];
    for (const med of meds) {
      await prisma.patientMedication.create({
        data: {
          patientId: patient.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          category: conditionCategory,
          notes: index % 4 === 0 ? "Prefers 30-day synchronized pickup." : null
        }
      });
    }

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await prisma.refillEvent.create({
        data: {
          patientId: patient.id,
          branchId: branch.id,
          handledById: assignedStaff.id,
          refillDate: addDays(-(cycle * 28 + (index % 4))),
          status: cycle === 1 && status === PatientStatus.OVERDUE ? "Missed" : "Collected",
          amount: money(28 + (index % 7) * 6 + cycle * 3),
          notes: cycle === 1 && status === PatientStatus.OVERDUE ? "No collection recorded after reminder." : "Cycle completed."
        }
      });
    }
  }

  for (let index = 0; index < 40; index += 1) {
    const patient = patients[index % patients.length];
    const branch = branchList[index % branchList.length];
    const assignedStaff = staff[(index + 2) % staff.length];
    const type = followUpTypes[index % followUpTypes.length];
    const dueOffset = type === FollowUpType.OVERDUE ? -((index % 4) + 1) : type === FollowUpType.DUE_TODAY ? 0 : (index % 5) + 1;
    const reason = {
      [FollowUpType.DUE_TODAY]: "Refill due today",
      [FollowUpType.OVERDUE]: "Refill overdue",
      [FollowUpType.PRESCRIPTION_RENEWAL_NEEDED]: "Prescription renewal needed",
      [FollowUpType.PAYMENT_PENDING]: "Payment pending after quote",
      [FollowUpType.DELIVERY_CONFIRMATION]: "Confirm delivery or collection",
      [FollowUpType.LOST_PATIENT_REVIVAL]: "Patient has not refilled recently"
    }[type];

    const followUpStatus =
      index % 17 === 0 ? FollowUpStatus.DONE :
      index % 13 === 0 ? FollowUpStatus.SNOOZED :
      index % 11 === 0 ? FollowUpStatus.IN_PROGRESS :
      FollowUpStatus.PENDING;
    const completed = followUpStatus === FollowUpStatus.DONE;
    const snoozed = followUpStatus === FollowUpStatus.SNOOZED;

    await prisma.followUpTask.create({
      data: {
        patientId: patient.id,
        customerName: patient.name,
        type,
        status: followUpStatus,
        reason,
        branchId: branch.id,
        dueDate: addDays(dueOffset),
        suggestedAction: type === FollowUpType.LOST_PATIENT_REVIVAL ? "Send revival offer and ask if they changed medication." : "Send WhatsApp message and log response.",
        suggestedMessage: `Hi ${patient.name.split(" ")[0]}, this is PORTIONS ${branch.name}. ${reason}. Can we help prepare your medicines today?`,
        assignedStaffId: assignedStaff.id,
        snoozedUntil: snoozed ? addDays(2) : null,
        startedAt: followUpStatus === FollowUpStatus.IN_PROGRESS || completed ? addDays(-1) : null,
        completedAt: completed ? addDays(0) : null,
        lastContactedAt: completed ? addDays(0) : null,
        outcomeType: completed ? FollowUpOutcomeType.REFILL_CONFIRMED : null,
        outcomeNotes: completed ? "Patient confirmed refill support and branch collection." : null,
        valueAmount: money(completed ? 42 + (index % 6) * 8 : 0),
        activities: {
          create: [
            {
              activityType: "CREATED",
              description: "Follow-up created from seeded chronic revenue workflow.",
              actorName: "PORTIONS"
            },
            ...(followUpStatus === FollowUpStatus.IN_PROGRESS
              ? [{ activityType: "STARTED", description: `Started by ${assignedStaff.name}.`, actorName: assignedStaff.name }]
              : []),
            ...(snoozed
              ? [{ activityType: "SNOOZED", description: "Snoozed for patient callback window.", actorName: assignedStaff.name }]
              : []),
            ...(completed
              ? [{ activityType: "COMPLETED", description: "Follow-up completed with refill confirmed.", actorName: assignedStaff.name }]
              : [])
          ]
        }
      }
    });
  }

  const orderSources = [OrderSource.WHATSAPP, OrderSource.WEBSITE, OrderSource.APP, OrderSource.WALK_IN, OrderSource.DIASPORA];
  const orderStatuses = [
    OrderStatus.NEW,
    OrderStatus.PHARMACIST_REVIEW,
    OrderStatus.QUOTED,
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAID,
    OrderStatus.PACKED,
    OrderStatus.DISPATCHED,
    OrderStatus.DELIVERED
  ];
  const orderTypes = [OrderType.PRESCRIPTION, OrderType.REFILL, OrderType.OTC, OrderType.FAMILY_PACK];

  for (let index = 0; index < 25; index += 1) {
    const patient = patients[index % patients.length];
    const branch = branchList[(index + 1) % branchList.length];
    const source = orderSources[index % orderSources.length];
    const status = orderStatuses[index % orderStatuses.length];
    const amount = 24 + (index % 9) * 11 + (source === OrderSource.DIASPORA ? 38 : 0);
    const branchUnit = branchOperatingUnits.get(branch.id);
    const originUnit = source === OrderSource.WALK_IN ? branchUnit : onlineUnit;

    await prisma.order.create({
      data: {
        customerName: patient.name,
        phone: patient.phone,
        source,
        branchId: branch.id,
        fulfillmentBranchId: branch.id,
        originatingOperatingUnitId: originUnit?.id,
        assignedOperatingUnitId: source === OrderSource.WALK_IN ? branchUnit?.id : onlineUnit.id,
        type: orderTypes[index % orderTypes.length],
        status,
        amount: money(amount),
        createdAt: index < 15 ? addDays(0) : addDays(-(index % 6)),
        assignedStaffId: staff[(index + 3) % staff.length].id,
        patientId: patient.id,
        paymentStatus: paidOrderStatuses.includes(status) ? "Paid" : status === OrderStatus.AWAITING_PAYMENT ? "Awaiting payment" : "Not requested",
        fulfillmentPreference: index % 3 === 0 ? "Delivery" : index % 3 === 1 ? "Collection" : "Courier to family member",
        internalNotes: index % 5 === 0 ? "Diaspora payer requested WhatsApp receipt." : "Standard order flow.",
        items: {
          create: [
            {
              productName: stockProducts[index % stockProducts.length].name,
              category: stockProducts[index % stockProducts.length].category,
              quantity: 1 + (index % 2),
              unitPrice: money(amount * 0.58)
            },
            {
              productName: index % 2 === 0 ? "Delivery Fee" : "Dispensing Support",
              category: index % 2 === 0 ? "Service" : "Prescription",
              quantity: 1,
              unitPrice: money(amount * 0.18)
            }
          ]
        }
      }
    });
  }

  const stockStatuses = [
    StockStatus.HEALTHY,
    StockStatus.LOW_STOCK,
    StockStatus.OVERSTOCK,
    StockStatus.NEAR_EXPIRY,
    StockStatus.DEAD_STOCK
  ];

  for (const [branchIndex, branch] of branchList.entries()) {
    for (const [productIndex, product] of stockProducts.entries()) {
      const status = stockStatuses[(branchIndex + productIndex) % stockStatuses.length];
      const stockLevel = status === StockStatus.LOW_STOCK ? product.reorder - 8 : status === StockStatus.OVERSTOCK ? product.reorder * 4 : status === StockStatus.DEAD_STOCK ? product.reorder * 2 : product.reorder + 25;

      await prisma.stockItem.create({
        data: {
          productName: product.name,
          category: product.category,
          branchId: branch.id,
          stockLevel,
          reorderLevel: product.reorder,
          status,
          expiryDate: status === StockStatus.NEAR_EXPIRY ? addDays(45 + productIndex) : status === StockStatus.DEAD_STOCK ? addDays(160) : addDays(280 + productIndex),
          suggestedAction:
            status === StockStatus.LOW_STOCK
              ? "Reorder within 24 hours and reserve for chronic patients."
              : status === StockStatus.NEAR_EXPIRY
                ? "Promote controlled sell-through and avoid fresh reorder."
                : status === StockStatus.OVERSTOCK
                  ? "Transfer surplus to higher demand branch."
                  : status === StockStatus.DEAD_STOCK
                    ? "Review demand and reduce future purchasing."
                    : "Maintain current reorder rhythm.",
          valueAtRisk: money(status === StockStatus.NEAR_EXPIRY || status === StockStatus.DEAD_STOCK ? stockLevel * 5.4 : 0)
        }
      });
    }
  }

  await prisma.report.createMany({
    data: [
      {
        type: ReportType.DAILY_EXECUTIVE,
        title: "Daily Executive Report",
        description: "Revenue, orders, chronic risk, and branch exceptions for the day.",
        lastGeneratedAt: addDays(0),
        keyMetric: "USD 8,940 revenue today"
      },
      {
        type: ReportType.WEEKLY_BRANCH,
        title: "Weekly Branch Report",
        description: "Branch-by-branch performance, conversion, and response quality.",
        lastGeneratedAt: addDays(-2),
        keyMetric: "Borrowdale +14% vs target"
      },
      {
        type: ReportType.CHRONIC_RETENTION,
        title: "Chronic Retention Report",
        description: "Refill adherence, overdue patients, and lost patient recovery.",
        lastGeneratedAt: addDays(-3),
        keyMetric: "87% refill adherence"
      },
      {
        type: ReportType.ONLINE_SALES,
        title: "Online Sales Report",
        description: "WhatsApp, website, app, and diaspora order funnel health.",
        lastGeneratedAt: addDays(-1),
        keyMetric: "31% online conversion"
      },
      {
        type: ReportType.STOCK_RISK,
        title: "Stock Risk Report",
        description: "Low stock, near-expiry value, dead stock, and transfer suggestions.",
        lastGeneratedAt: addDays(-4),
        keyMetric: "USD 3,260 value at risk"
      },
      {
        type: ReportType.STAFF_FOLLOW_UP,
        title: "Staff Follow-Up Report",
        description: "Task completion, response speed, and patient contact quality.",
        lastGeneratedAt: addDays(-2),
        keyMetric: "91% follow-up completion"
      }
    ]
  });

  const staffByName = await prisma.staffMember.findMany();
  const staffMap = new Map(staffByName.map((staff) => [staff.name, staff]));
  const actionSeeds = [
    {
      title: "Contact overdue hypertension patient",
      description: "Recover an overdue refill patient and offer delivery or branch collection before marking as lost.",
      category: OperationalActionCategory.CHRONIC_PATIENT,
      priority: OperationalActionPriority.CRITICAL,
      status: OperationalActionStatus.OPEN,
      sourceType: "PATIENT",
      branchName: "Avondale",
      staffName: "Chipo Mlambo",
      dueDate: addDays(0),
      valueAmount: money(95)
    },
    {
      title: "Recover awaiting payment order",
      description: "Send payment reminder for a quoted online order and confirm payment before close of business.",
      category: OperationalActionCategory.ORDER_RECOVERY,
      priority: OperationalActionPriority.HIGH,
      status: OperationalActionStatus.IN_PROGRESS,
      sourceType: "ORDER",
      branchName: "CBD",
      staffName: "Tinashe Zhou",
      dueDate: addDays(0),
      valueAmount: money(145)
    },
    {
      title: "Transfer low-stock chronic medicine",
      description: "Move surplus stock to the branch with refill pressure before chronic patients arrive this week.",
      category: OperationalActionCategory.STOCK_INTERVENTION,
      priority: OperationalActionPriority.HIGH,
      status: OperationalActionStatus.OPEN,
      sourceType: "STOCK",
      branchName: "Eastlea",
      staffName: "Munashe Gumbo",
      dueDate: addDays(1),
      valueAmount: money(320)
    },
    {
      title: "Review branch follow-up backlog",
      description: "Branch manager must review overdue follow-ups and assign owner for each unresolved patient task.",
      category: OperationalActionCategory.BRANCH_ISSUE,
      priority: OperationalActionPriority.MEDIUM,
      status: OperationalActionStatus.BLOCKED,
      sourceType: "BRANCH",
      branchName: "Chitungwiza",
      staffName: "Chipo Mlambo",
      dueDate: addDays(-1),
      valueAmount: money(0)
    },
    {
      title: "Complete 7-day pilot review",
      description: "Prepare the first pilot review pack and confirm next 7-day priorities with the owner.",
      category: OperationalActionCategory.PILOT_TASK,
      priority: OperationalActionPriority.MEDIUM,
      status: OperationalActionStatus.COMPLETED,
      sourceType: "PILOT_COMMAND",
      branchName: "Borrowdale",
      staffName: "Rudo Mutasa",
      dueDate: addDays(-2),
      completedAt: addDays(-1),
      outcomeType: OperationalActionOutcome.REVENUE_PROTECTED,
      outcomeNotes: "Prepared review pack and confirmed chronic recovery as the next sprint.",
      valueAmount: money(750)
    }
  ];

  const seededActions: Awaited<ReturnType<typeof prisma.operationalAction.create>>[] = [];

  for (const action of actionSeeds) {
    const branch = branches.get(action.branchName);
    const staff = staffMap.get(action.staffName);
    const created = await prisma.operationalAction.create({
      data: {
        title: action.title,
        description: action.description,
        category: action.category,
        priority: action.priority,
        status: action.status,
        sourceType: action.sourceType,
        branchId: branch?.id,
        assignedStaffId: staff?.id,
        dueDate: action.dueDate,
        completedAt: action.completedAt,
        outcomeType: action.outcomeType,
        outcomeNotes: action.outcomeNotes,
        valueAmount: action.valueAmount,
        activities: {
          create: [
            {
              activityType: "CREATED",
              description: "Action created from seeded PORTIONS operating insight.",
              actorName: "PORTIONS"
            },
            ...(action.status === OperationalActionStatus.COMPLETED
              ? [{
                  activityType: "COMPLETED",
                  description: "Outcome recorded for demo accountability reporting.",
                  actorName: action.staffName
                }]
              : [])
          ]
        }
      }
    });
    seededActions.push(created);

    if (created.status !== OperationalActionStatus.COMPLETED && staff) {
      await prisma.operationalActionActivity.create({
        data: {
          actionId: created.id,
          activityType: "ASSIGNED",
          description: `Assigned to ${staff.name}.`,
          actorName: "PORTIONS"
        }
      });
    }
  }

  const openActions = seededActions.filter((action) => action.status !== OperationalActionStatus.COMPLETED && action.status !== OperationalActionStatus.CANCELLED);
  const criticalAction = openActions.find((action) => action.priority === OperationalActionPriority.CRITICAL);
  const blockedAction = openActions.find((action) => action.status === OperationalActionStatus.BLOCKED);
  const overdueAction = openActions.find((action) => action.dueDate && action.dueDate < today);
  const dueTodayAction = openActions.find((action) => action.dueDate && action.dueDate.toDateString() === today.toDateString());

  await prisma.notification.createMany({
    data: [
      ...(criticalAction ? [{
        type: NotificationType.CRITICAL_ACTION,
        severity: NotificationSeverity.CRITICAL,
        status: NotificationStatus.UNREAD,
        title: `Critical action requires attention: ${criticalAction.title}`,
        message: `Critical action: '${criticalAction.title}' requires management attention now. Assign, start, or resolve before close.`,
        recipientType: NotificationRecipientType.MANAGEMENT,
        recipientRole: "General Manager",
        branchId: criticalAction.branchId,
        sourceType: "OPERATIONAL_ACTION",
        sourceId: criticalAction.id,
        actionId: criticalAction.id,
        scheduledFor: criticalAction.dueDate,
        triggeredAt: today,
        deliveryChannel: NotificationDeliveryChannel.IN_APP,
        deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
        metadata: { seed: true, reason: "critical action" }
      }] : []),
      ...(dueTodayAction ? [{
        type: NotificationType.ACTION_DUE,
        severity: NotificationSeverity.MEDIUM,
        status: NotificationStatus.UNREAD,
        title: `Action due today: ${dueTodayAction.title}`,
        message: `The action '${dueTodayAction.title}' is due today. Confirm ownership and update PORTIONS before close.`,
        recipientType: dueTodayAction.assignedStaffId ? NotificationRecipientType.STAFF : NotificationRecipientType.BRANCH_MANAGER,
        recipientStaffId: dueTodayAction.assignedStaffId,
        recipientRole: dueTodayAction.assignedStaffId ? null : "Branch Manager",
        branchId: dueTodayAction.branchId,
        sourceType: "OPERATIONAL_ACTION",
        sourceId: dueTodayAction.id,
        actionId: dueTodayAction.id,
        scheduledFor: dueTodayAction.dueDate,
        triggeredAt: today,
        deliveryChannel: NotificationDeliveryChannel.IN_APP,
        deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
        metadata: { seed: true, reason: "due today" }
      }] : []),
      ...(overdueAction ? [{
        type: NotificationType.ACTION_OVERDUE,
        severity: NotificationSeverity.HIGH,
        status: NotificationStatus.ACKNOWLEDGED,
        title: `Overdue action: ${overdueAction.title}`,
        message: `Action overdue: '${overdueAction.title}' was due earlier and needs a status update or manager escalation.`,
        recipientType: NotificationRecipientType.BRANCH_MANAGER,
        recipientRole: "Branch Manager",
        branchId: overdueAction.branchId,
        sourceType: "OPERATIONAL_ACTION",
        sourceId: overdueAction.id,
        actionId: overdueAction.id,
        scheduledFor: overdueAction.dueDate,
        triggeredAt: addDays(-1),
        acknowledgedAt: today,
        deliveryChannel: NotificationDeliveryChannel.WHATSAPP_READY,
        deliveryStatus: NotificationDeliveryStatus.READY,
        metadata: { seed: true, reason: "overdue action" }
      }] : []),
      ...(blockedAction ? [{
        type: NotificationType.ACTION_BLOCKED,
        severity: NotificationSeverity.HIGH,
        status: NotificationStatus.UNREAD,
        title: `Blocked action: ${blockedAction.title}`,
        message: `Blocked action: '${blockedAction.title}' needs escalation. Confirm the blocker and next decision owner.`,
        recipientType: NotificationRecipientType.MANAGEMENT,
        recipientRole: "Operations Manager",
        branchId: blockedAction.branchId,
        sourceType: "OPERATIONAL_ACTION",
        sourceId: blockedAction.id,
        actionId: blockedAction.id,
        scheduledFor: blockedAction.dueDate,
        triggeredAt: today,
        deliveryChannel: NotificationDeliveryChannel.IN_APP,
        deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
        metadata: { seed: true, reason: "blocked action" }
      }] : []),
      {
        type: NotificationType.PILOT_REVIEW,
        severity: NotificationSeverity.INFO,
        status: NotificationStatus.RESOLVED,
        title: "Pilot review evidence ready",
        message: "Pilot review reminder: confirm evidence, action completion, and unresolved escalation items before the next owner review.",
        recipientType: NotificationRecipientType.OWNER,
        recipientRole: "Owner",
        sourceType: "PILOT_COMMAND",
        sourceId: "pilot-command",
        triggeredAt: addDays(-2),
        resolvedAt: addDays(-1),
        deliveryChannel: NotificationDeliveryChannel.IN_APP,
        deliveryStatus: NotificationDeliveryStatus.NOT_REQUIRED,
        metadata: { seed: true, reason: "pilot review" }
      }
    ]
  });

  const [demoFollowUp, demoOrder, demoEvent, demoNotification] = await Promise.all([
    prisma.followUpTask.findFirst({ include: { patient: true, branch: true, assignedStaff: true }, orderBy: { dueDate: "asc" } }),
    prisma.order.findFirst({ where: { status: OrderStatus.AWAITING_PAYMENT }, include: { patient: true, branch: true, assignedStaff: true }, orderBy: { createdAt: "desc" } }),
    prisma.event.findFirst({ include: { ownerStaff: true, branch: true }, orderBy: { startDate: "asc" } }),
    prisma.notification.findFirst({ include: { recipientStaff: true, branch: true, action: true }, orderBy: { createdAt: "desc" } })
  ]);
  const demoAction = openActions[0];
  const communicationSeedFields = (unit?: OperatingUnit | null) => ({
    sendingOperatingUnitId: unit?.id ?? null,
    sendingWhatsappNumber: unit?.whatsappNumber ?? null,
    sendingContactLabel: unit?.contactLabel ?? unit?.name ?? null
  });
  const branchSendingUnit = (branchId?: string | null) => (branchId ? branchOperatingUnits.get(branchId) : null) ?? onlineUnit;

  await prisma.communication.createMany({
    data: [
      ...(demoFollowUp ? [{
        channel: CommunicationChannel.WHATSAPP,
        status: CommunicationStatus.READY,
        recipientName: demoFollowUp.patient?.name ?? demoFollowUp.customerName,
        recipientPhone: demoFollowUp.patient?.phone ?? null,
        recipientType: demoFollowUp.patient ? CommunicationRecipientType.PATIENT : CommunicationRecipientType.CUSTOMER,
        message: `Hi ${(demoFollowUp.patient?.name ?? demoFollowUp.customerName).split(" ")[0]}, this is PORTIONS Demo Pharmacy. Your refill is due. Would you prefer branch collection or delivery?`,
        subject: "Refill reminder",
        sourceType: "FOLLOW_UP_TASK",
        sourceId: demoFollowUp.id,
        patientId: demoFollowUp.patientId,
        followUpTaskId: demoFollowUp.id,
        assignedStaffId: demoFollowUp.assignedStaffId,
        branchId: demoFollowUp.branchId,
        ...communicationSeedFields(branchSendingUnit(demoFollowUp.branchId)),
        metadata: { seed: true, templateType: "REFILL_REMINDER" }
      }] : []),
      ...(demoOrder ? [{
        channel: CommunicationChannel.WHATSAPP,
        status: CommunicationStatus.SENT,
        recipientName: demoOrder.customerName,
        recipientPhone: demoOrder.phone,
        recipientType: demoOrder.patient ? CommunicationRecipientType.PATIENT : CommunicationRecipientType.CUSTOMER,
        message: `Hi ${demoOrder.customerName.split(" ")[0]}, your order is ready for the next step. Please confirm payment or let us know if you need assistance.`,
        subject: "Order payment reminder",
        sourceType: "ORDER",
        sourceId: demoOrder.id,
        patientId: demoOrder.patientId,
        orderId: demoOrder.id,
        assignedStaffId: demoOrder.assignedStaffId,
        branchId: demoOrder.branchId,
        ...communicationSeedFields(demoOrder.source === OrderSource.WALK_IN ? branchSendingUnit(demoOrder.branchId) : onlineUnit),
        openedAt: addDays(-1),
        sentAt: addDays(-1),
        metadata: { seed: true, templateType: "ORDER_PAYMENT" }
      }] : []),
      ...(demoEvent ? [{
        channel: CommunicationChannel.WHATSAPP,
        status: CommunicationStatus.OPENED,
        recipientName: demoEvent.ownerStaff?.name ?? demoEvent.companyName ?? demoEvent.title,
        recipientPhone: demoEvent.ownerStaff?.phone ?? null,
        recipientType: demoEvent.ownerStaff ? CommunicationRecipientType.STAFF : CommunicationRecipientType.EVENT_PARTNER,
        message: `Hi ${demoEvent.ownerStaff?.name ?? demoEvent.companyName ?? "there"}, reminder: ${demoEvent.title} is scheduled for ${demoEvent.startDate.toISOString().slice(0, 10)}. Please confirm your availability and preparations.`,
        subject: "Event preparation reminder",
        sourceType: "EVENT",
        sourceId: demoEvent.id,
        eventId: demoEvent.id,
        assignedStaffId: demoEvent.ownerStaffId,
        branchId: demoEvent.branchId,
        ...communicationSeedFields(branchSendingUnit(demoEvent.branchId)),
        openedAt: addDays(0),
        metadata: { seed: true, templateType: "EVENT_REMINDER" }
      }] : []),
      ...(demoAction ? [{
        channel: CommunicationChannel.WHATSAPP,
        status: CommunicationStatus.RESPONDED,
        recipientName: staff.find((member) => member.id === demoAction.assignedStaffId)?.name ?? "Action owner",
        recipientPhone: staff.find((member) => member.id === demoAction.assignedStaffId)?.phone ?? null,
        recipientType: CommunicationRecipientType.STAFF,
        message: `Hi ${staff.find((member) => member.id === demoAction.assignedStaffId)?.name ?? "there"}, the action '${demoAction.title}' is due soon. Please update PORTIONS when you start or complete it.`,
        subject: "Staff action reminder",
        sourceType: "OPERATIONAL_ACTION",
        sourceId: demoAction.id,
        operationalActionId: demoAction.id,
        assignedStaffId: demoAction.assignedStaffId,
        branchId: demoAction.branchId,
        ...communicationSeedFields(branchSendingUnit(demoAction.branchId)),
        openedAt: addDays(-1),
        sentAt: addDays(-1),
        respondedAt: addDays(0),
        responseText: "I have started this and will update before close.",
        outcomeType: CommunicationOutcomeType.RESPONSE_RECEIVED,
        metadata: { seed: true, templateType: "ACTION_REMINDER" }
      }] : []),
      ...(demoNotification ? [{
        channel: CommunicationChannel.WHATSAPP,
        status: CommunicationStatus.SENT,
        recipientName: demoNotification.recipientStaff?.name ?? demoNotification.recipientRole ?? "Operations manager",
        recipientPhone: demoNotification.recipientStaff?.phone ?? null,
        recipientType: demoNotification.recipientStaff ? CommunicationRecipientType.STAFF : CommunicationRecipientType.OTHER,
        message: `Hi ${demoNotification.recipientStaff?.name ?? "there"}, PORTIONS has flagged '${demoNotification.title}'. Please review and update the relevant work item before close of business.`,
        subject: "Notification escalation",
        sourceType: "NOTIFICATION",
        sourceId: demoNotification.id,
        notificationId: demoNotification.id,
        operationalActionId: demoNotification.actionId,
        assignedStaffId: demoNotification.recipientStaffId,
        branchId: demoNotification.branchId,
        ...communicationSeedFields(branchSendingUnit(demoNotification.branchId)),
        openedAt: addDays(0),
        sentAt: addDays(0),
        followUpRequired: true,
        followUpDate: addDays(1),
        metadata: { seed: true, templateType: "NOTIFICATION_ESCALATION" }
      }] : [])
    ]
  });

  const communications = await prisma.communication.findMany({ select: { id: true, status: true, sourceType: true, recipientName: true } });
  await prisma.communicationActivity.createMany({
    data: communications.flatMap((communication) => [
      {
        communicationId: communication.id,
        activityType: "CREATED",
        description: `Seeded ${communication.sourceType.toLowerCase().replace(/_/g, " ")} communication for ${communication.recipientName}.`,
        actorName: "PORTIONS"
      },
      ...(communication.status === CommunicationStatus.SENT || communication.status === CommunicationStatus.RESPONDED
        ? [{
            communicationId: communication.id,
            activityType: "MARKED_SENT",
            description: "Manual delivery confirmed in demo data.",
            actorName: "PORTIONS"
          }]
        : [])
    ])
  });

  console.log("PORTIONS demo database seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
