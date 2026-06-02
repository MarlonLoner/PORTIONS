import {
  FollowUpStatus,
  FollowUpType,
  OrderSource,
  OrderStatus,
  OrderType,
  PackageType,
  PatientStatus,
  PrismaClient,
  ReportType,
  RiskScore,
  StockStatus
} from "@prisma/client";
import type { Branch, Patient, StaffMember } from "@prisma/client";

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
  await prisma.report.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.refillEvent.deleteMany();
  await prisma.patientMedication.deleteMany();
  await prisma.patient.deleteMany();
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

    await prisma.followUpTask.create({
      data: {
        patientId: patient.id,
        customerName: patient.name,
        type,
        status: index % 13 === 0 ? FollowUpStatus.SNOOZED : FollowUpStatus.PENDING,
        reason,
        branchId: branch.id,
        dueDate: addDays(dueOffset),
        suggestedAction: type === FollowUpType.LOST_PATIENT_REVIVAL ? "Send revival offer and ask if they changed medication." : "Send WhatsApp message and log response.",
        suggestedMessage: `Hi ${patient.name.split(" ")[0]}, this is PORTIONS ${branch.name}. ${reason}. Can we help prepare your medicines today?`,
        assignedStaffId: assignedStaff.id
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

    await prisma.order.create({
      data: {
        customerName: patient.name,
        phone: patient.phone,
        source,
        branchId: branch.id,
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
