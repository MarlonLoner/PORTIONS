export type AssignmentStaff = {
  id: string;
  name: string;
  role?: string | null;
  branchId?: string | null;
  branchName?: string | null;
};

export type AssignmentAction = {
  id: string;
  category: string;
  sourceType?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  assignedStaffId?: string | null;
  status?: string | null;
  dueDate?: string | Date | null;
};

export type AssignmentRecommendation = {
  staff: AssignmentStaff | null;
  reason: string;
  branchStaffCount: number;
  compatibleStaff: AssignmentStaff[];
};

const closedStatuses = new Set(["COMPLETED", "CANCELLED"]);

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[_-]/g, " ");
}

function hasRole(staff: AssignmentStaff, words: string[]) {
  const role = normalized(staff.role);
  return words.some((word) => role.includes(word));
}

function isActive(action: AssignmentAction) {
  return !closedStatuses.has(action.status ?? "");
}

function isOverdue(action: AssignmentAction) {
  if (!action.dueDate || !isActive(action)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(action.dueDate);
  return !Number.isNaN(due.getTime()) && due < today;
}

function workloadForStaff(staffId: string, actions: AssignmentAction[]) {
  const assigned = actions.filter((action) => action.assignedStaffId === staffId && isActive(action));
  return {
    active: assigned.length,
    overdue: assigned.filter(isOverdue).length
  };
}

function roleScore(action: AssignmentAction, staff: AssignmentStaff) {
  switch (action.category) {
    case "BRANCH_ISSUE":
      if (hasRole(staff, ["branch manager", "manager"])) return 0;
      if (hasRole(staff, ["senior", "lead", "supervisor"])) return 1;
      return 5;
    case "CHRONIC_PATIENT":
      if (hasRole(staff, ["patient", "support", "care", "follow"])) return 0;
      if (hasRole(staff, ["pharmacist", "pharmacy"])) return 1;
      if (hasRole(staff, ["branch manager", "manager"])) return 3;
      return 5;
    case "ORDER_RECOVERY":
      if (hasRole(staff, ["sales", "support", "customer", "order", "call"])) return 0;
      if (hasRole(staff, ["branch manager", "manager"])) return 2;
      if (hasRole(staff, ["pharmacist", "pharmacy"])) return 3;
      return 5;
    case "STOCK_INTERVENTION":
      if (hasRole(staff, ["stock", "inventory", "controller", "warehouse"])) return 0;
      if (hasRole(staff, ["pharmacist", "pharmacy"])) return 1;
      if (hasRole(staff, ["branch manager", "manager"])) return 2;
      return 5;
    case "PILOT_TASK":
      if (hasRole(staff, ["general manager", "operations", "pilot", "owner"])) return 0;
      if (hasRole(staff, ["branch manager", "manager"])) return 1;
      return 4;
    case "MANAGEMENT_DECISION":
      if (hasRole(staff, ["owner", "ceo", "general manager", "operations"])) return 0;
      if (hasRole(staff, ["branch manager", "manager"])) return 2;
      return 6;
    default:
      if (hasRole(staff, ["manager", "support", "pharmacist"])) return 2;
      return 5;
  }
}

export function getCompatibleAssignmentStaff(action: AssignmentAction, staff: AssignmentStaff[]) {
  if (action.branchId) {
    return staff.filter((member) => member.branchId === action.branchId);
  }
  return staff;
}

export function getRecommendedAssignees(action: AssignmentAction, staff: AssignmentStaff[], actions: AssignmentAction[]) {
  const compatibleStaff = getCompatibleAssignmentStaff(action, staff);
  return compatibleStaff
    .map((member) => {
      const workload = workloadForStaff(member.id, actions);
      return {
        staff: member,
        score: roleScore(action, member) * 100 + workload.overdue * 10 + workload.active,
        workload
      };
    })
    .sort((a, b) => a.score - b.score || a.staff.name.localeCompare(b.staff.name));
}

export function getAssignmentRecommendationReason(action: AssignmentAction, staff: AssignmentStaff, actions: AssignmentAction[]) {
  const workload = workloadForStaff(staff.id, actions);
  const branchName = action.branchName ?? staff.branchName ?? "the action branch";
  const role = staff.role ? `${staff.role}` : "configured staff member";

  if (action.category === "BRANCH_ISSUE" && hasRole(staff, ["branch manager", "manager"])) {
    return `${branchName} ${role.toLowerCase()} with ${workload.active} active actions.`;
  }
  if (action.category === "CHRONIC_PATIENT" && hasRole(staff, ["patient", "support", "care", "follow", "pharmacist"])) {
    return `${branchName} ${role.toLowerCase()} suited to chronic patient follow-up, with ${workload.overdue} overdue actions.`;
  }
  if (action.category === "ORDER_RECOVERY" && hasRole(staff, ["sales", "support", "customer", "order", "manager"])) {
    return `${branchName} ${role.toLowerCase()} suited to order recovery and customer follow-up.`;
  }
  if (action.category === "STOCK_INTERVENTION" && hasRole(staff, ["stock", "inventory", "controller", "pharmacist", "manager"])) {
    return `${branchName} ${role.toLowerCase()} suited to stock intervention and branch coordination.`;
  }
  if (action.category === "PILOT_TASK" || action.category === "MANAGEMENT_DECISION") {
    return `${role} is the strongest available owner for this management-level action, with ${workload.active} active actions.`;
  }
  return `${branchName} staff member with the lowest compatible workload: ${workload.active} active and ${workload.overdue} overdue actions.`;
}

export function getRecommendedAssignee(action: AssignmentAction, staff: AssignmentStaff[], actions: AssignmentAction[]): AssignmentRecommendation {
  const compatibleStaff = getCompatibleAssignmentStaff(action, staff);
  const ranked = getRecommendedAssignees(action, staff, actions);
  const top = ranked[0]?.staff ?? null;

  return {
    staff: top,
    reason: top
      ? getAssignmentRecommendationReason(action, top, actions)
      : action.branchId
        ? "No staff members are configured for this branch."
        : "No staff members are available for assignment.",
    branchStaffCount: compatibleStaff.length,
    compatibleStaff
  };
}
