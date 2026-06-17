import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tenantTables = [
  "AppUser",
  "OperatingUnit",
  "Branch",
  "StaffMember",
  "Patient",
  "PatientMedication",
  "RefillEvent",
  "FollowUpTask",
  "FollowUpTaskActivity",
  "Order",
  "OrderItem",
  "StockItem",
  "Report",
  "PilotRequest",
  "ImportBatch",
  "OperationalAction",
  "OperationalActionActivity",
  "Notification",
  "Communication",
  "CommunicationActivity",
  "TenantOnboarding",
  "TenantOnboardingStep",
  "Event",
  "EventChecklistItem",
  "EventExpense",
  "EventActivity",
  "EventReview"
];

type Finding = {
  check: string;
  count: number;
  severity: "info" | "warning" | "critical";
};

async function count(sql: string) {
  const result = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(sql);
  return Number(result[0]?.count ?? 0);
}

async function tableExists(tableName: string) {
  return (await count(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName.replace(/'/g, "''")}'`)) > 0;
}

async function columnExists(tableName: string, columnName: string) {
  return (await count(`SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName.replace(/'/g, "''")}' AND column_name = '${columnName.replace(/'/g, "''")}'`)) > 0;
}

async function addNullTenantFindings(findings: Finding[]) {
  for (const table of tenantTables) {
    if (!(await tableExists(table)) || !(await columnExists(table, "tenantId"))) continue;
    const nullCount = await count(`SELECT COUNT(*) FROM "${table}" WHERE "tenantId" IS NULL`);
    findings.push({ check: `${table}.tenantId null records`, count: nullCount, severity: nullCount ? "critical" : "info" });
  }
}

async function main() {
  const findings: Finding[] = [];

  await addNullTenantFindings(findings);

  if (await tableExists("Tenant")) {
    const duplicateSlugs = await count(`
      SELECT COUNT(*)
      FROM (
        SELECT "slug"
        FROM "Tenant"
        GROUP BY "slug"
        HAVING COUNT(*) > 1
      ) duplicate_slugs
    `);
    findings.push({ check: "Duplicate tenant slugs", count: duplicateSlugs, severity: duplicateSlugs ? "critical" : "info" });
  }

  if (await tableExists("UserOperatingUnitAccess") && await columnExists("AppUser", "tenantId") && await columnExists("OperatingUnit", "tenantId")) {
    const unitAccessMismatches = await count(`
      SELECT COUNT(*)
      FROM "UserOperatingUnitAccess" access
      JOIN "AppUser" u ON u."id" = access."userId"
      JOIN "OperatingUnit" ou ON ou."id" = access."operatingUnitId"
      WHERE u."tenantId" IS DISTINCT FROM ou."tenantId"
    `);
    findings.push({ check: "User operating-unit tenant mismatches", count: unitAccessMismatches, severity: unitAccessMismatches ? "critical" : "info" });
  }

  if (await tableExists("OperatingUnit") && await columnExists("OperatingUnit", "tenantId") && await columnExists("Branch", "tenantId")) {
    const branchUnitMismatches = await count(`
      SELECT COUNT(*)
      FROM "OperatingUnit" ou
      JOIN "Branch" b ON b."id" = ou."branchId"
      WHERE ou."tenantId" IS DISTINCT FROM b."tenantId"
    `);
    findings.push({ check: "Branch operating-unit tenant mismatches", count: branchUnitMismatches, severity: branchUnitMismatches ? "critical" : "info" });
  }

  const relationChecks = [
    ["Patient", "Branch", "branchId"],
    ["StaffMember", "Branch", "branchId"],
    ["Order", "Branch", "branchId"],
    ["FollowUpTask", "Branch", "branchId"],
    ["StockItem", "Branch", "branchId"],
    ["Event", "Branch", "branchId"],
    ["Notification", "Branch", "branchId"],
    ["Communication", "Branch", "branchId"],
    ["PatientMedication", "Patient", "patientId"],
    ["OrderItem", "Order", "orderId"],
    ["FollowUpTaskActivity", "FollowUpTask", "followUpTaskId"],
    ["OperationalActionActivity", "OperationalAction", "actionId"],
    ["EventChecklistItem", "Event", "eventId"],
    ["EventExpense", "Event", "eventId"],
    ["EventActivity", "Event", "eventId"],
    ["EventReview", "Event", "eventId"],
    ["CommunicationActivity", "Communication", "communicationId"],
    ["TenantOnboardingStep", "TenantOnboarding", "onboardingId"]
  ] as const;

  for (const [child, parent, fk] of relationChecks) {
    if (!(await tableExists(child)) || !(await tableExists(parent))) continue;
    if (!(await columnExists(child, "tenantId")) || !(await columnExists(parent, "tenantId")) || !(await columnExists(child, fk))) continue;
    const mismatches = await count(`
      SELECT COUNT(*)
      FROM "${child}" child
      JOIN "${parent}" parent ON parent."id" = child."${fk}"
      WHERE child."tenantId" IS DISTINCT FROM parent."tenantId"
    `);
    findings.push({ check: `${child}.${fk} tenant mismatch`, count: mismatches, severity: mismatches ? "critical" : "info" });
  }

  if (await tableExists("TenantSupportAccessRequest")) {
    const orphanedSupport = await count(`
      SELECT COUNT(*)
      FROM "TenantSupportAccessRequest" request
      LEFT JOIN "Tenant" tenant ON tenant."id" = request."tenantId"
      LEFT JOIN "PlatformUser" platform_user ON platform_user."id" = request."requestedByPlatformUserId"
      WHERE tenant."id" IS NULL OR platform_user."id" IS NULL
    `);
    findings.push({ check: "Orphaned support access requests", count: orphanedSupport, severity: orphanedSupport ? "critical" : "info" });
  }

  const critical = findings.filter((finding) => finding.severity === "critical" && finding.count > 0);
  console.log(JSON.stringify({ ok: critical.length === 0, findings }, null, 2));
  if (critical.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Tenant integrity check failed.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
