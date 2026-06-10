export function getDemoScriptSteps() {
  return [
    {
      title: "The Owner's Morning Problem",
      href: "/",
      pageLabel: "Public landing",
      say: "Open with the reality that owners wake up needing to know what happened across branches before calling managers or waiting for manual reports.",
      pointAt: "The PORTIONS promise: chronic revenue, branches, orders, stock, and execution in one command system.",
      buyerQuestion: "Why does this matter to an owner or executive?",
      transition: "Once the problem is clear, show why convenience failure quietly costs money."
    },
    {
      title: "The Cost Of Convenience Failure",
      href: "/demo",
      pageLabel: "Demo story",
      say: "Explain that chronic patients forget refills, online orders get stuck, branches work in silos, and stock risk appears late.",
      pointAt: "The pain and value pillars on the demo walkthrough.",
      buyerQuestion: "What operational leakage does PORTIONS solve?",
      transition: "Now move from the story into the live command view."
    },
    {
      title: "Dashboard Command View",
      href: "/dashboard",
      pageLabel: "Dashboard",
      say: "Position the dashboard as the owner's first 60-second read of the pharmacy network.",
      pointAt: "Revenue, orders, chronic due, overdue patients, best branch, weak branch, and CEO Morning Brief.",
      buyerQuestion: "Can I understand the business without calling everyone?",
      transition: "The dashboard shows the numbers; the AI Brief explains what matters."
    },
    {
      title: "AI Brief",
      href: "/ai-brief",
      pageLabel: "AI Brief",
      say: "Frame this as the daily analyst that turns pharmacy noise into a prioritized action plan.",
      pointAt: "CEO Morning Brief, revenue diagnosis, chronic risk, branch coach, and staff action plan.",
      buyerQuestion: "Can the system tell my team what to do next?",
      transition: "The strongest money feature is chronic revenue protection."
    },
    {
      title: "Chronic Revenue Engine",
      href: "/patients",
      pageLabel: "Chronic Patients",
      say: "Show chronic patients as recurring revenue, not a static patient list.",
      pointAt: "Due today, overdue, high risk, VIP, revenue at risk, and refill opportunities.",
      buyerQuestion: "How does this protect repeat pharmacy revenue?",
      transition: "Once risk is visible, the team needs a recovery queue."
    },
    {
      title: "Follow-Up Recovery",
      href: "/follow-ups",
      pageLabel: "Follow-Up Queue",
      say: "Position this as the revenue recovery machine for support staff and pharmacists.",
      pointAt: "Urgency groups, suggested action, WhatsApp message, and overdue/high-risk visual priority.",
      buyerQuestion: "How do staff know who to call first?",
      transition: "The same control logic applies to online and branch orders."
    },
    {
      title: "Order Pipeline",
      href: "/orders",
      pageLabel: "Orders",
      say: "Show how PORTIONS captures orders from quote to payment, packing, dispatch, and delivery.",
      pointAt: "Awaiting review, awaiting payment, packed, dispatched, high-value and stuck orders.",
      buyerQuestion: "How do we stop online orders from leaking?",
      transition: "Next, show that every branch becomes a mini business unit."
    },
    {
      title: "Branch Command",
      href: "/branches",
      pageLabel: "Branches",
      say: "Explain that each branch gets measured on revenue, patients, orders, stock, and response discipline.",
      pointAt: "Branch health, revenue leakage, patient load, stock pressure, and suggested manager actions.",
      buyerQuestion: "Can I see which branch is winning and which branch needs help?",
      transition: "Branch performance depends heavily on stock availability."
    },
    {
      title: "Stock Intelligence",
      href: "/stock",
      pageLabel: "Stock",
      say: "Make stock feel like patient care and revenue risk, not just inventory.",
      pointAt: "Low stock, near expiry, chronic demand risk, suggested transfers, and reorder urgency.",
      buyerQuestion: "Can PORTIONS prevent stockouts before they cost revenue?",
      transition: "Then show how a real pilot gets data into the system safely."
    },
    {
      title: "Import And Onboarding Workflow",
      href: "/imports",
      pageLabel: "Imports",
      say: "Show that PORTIONS is deployable: templates, upload preview, validation, saved batches, approval, and safe execution.",
      pointAt: "Import templates, upload preview, batches, and onboarding steps.",
      buyerQuestion: "How hard is setup if our data is messy?",
      transition: "After setup, the pilot needs a control room."
    },
    {
      title: "Pilot Command Center",
      href: "/pilot-command",
      pageLabel: "Pilot Command",
      say: "Position this as the 30-day proof dashboard for rollout readiness and value creation.",
      pointAt: "Pilot status, day count, readiness, charts, timeline, risks, value created, and role actions.",
      buyerQuestion: "How do we know the pilot is working?",
      transition: "Executives need a shareable boardroom artifact."
    },
    {
      title: "Executive Export Pack",
      href: "/executive-pack",
      pageLabel: "Executive Pack",
      say: "Show the printable review pack that summarizes pilot evidence for owners and partners.",
      pointAt: "Executive summary, imported data, revenue control, chronic retention, stock risk, charts, and rollout recommendation.",
      buyerQuestion: "Can this become a decision document?",
      transition: "Close by making the next step small, controlled, and measurable."
    },
    {
      title: "Pilot Close",
      href: "/pilot",
      pageLabel: "Request Pilot",
      say: "Recommend a 30-day pilot with clear data sources, branch scope, and success metrics.",
      pointAt: "Pilot request form and setup expectations.",
      buyerQuestion: "What exactly happens next?",
      transition: "Confirm branch count, data sources, success metrics, and the setup call."
    }
  ];
}

export function getObjectionResponses() {
  return [
    {
      objection: "We already use ProPharm.",
      response: "PORTIONS is not replacing your POS. It sits above operational data to show revenue risk, follow-up discipline, branch performance, and executive actions."
    },
    {
      objection: "Our data is messy.",
      response: "That is exactly why the pilot starts with templates, upload preview, validation, and batch review before anything becomes live operating data."
    },
    {
      objection: "Staff may not use this.",
      response: "The pilot focuses on daily queues: who to call, what order is stuck, what stock needs action, and what the branch manager must fix today."
    },
    {
      objection: "How long does setup take?",
      response: "A focused pilot can begin with branches, staff, chronic patients, orders, stock, and follow-up CSVs. The first review can happen within seven days."
    },
    {
      objection: "Is this replacing our POS?",
      response: "No. PORTIONS is a command layer for retention, online order control, branch discipline, stock risk, and executive reporting."
    },
    {
      objection: "How do we know it will pay for itself?",
      response: "The Executive Pack shows payment leakage, chronic revenue protected, stock risk flagged, branch bottlenecks, and workload activated so value can be reviewed before rollout."
    }
  ];
}

export function getDemoChecklist() {
  return {
    before: [
      "Confirm internet",
      "Open live app",
      "Check demo code",
      "Open /demo-script",
      "Have /executive-pack ready",
      "Have pilot request link ready"
    ],
    after: [
      "Send pilot request link",
      "Send executive pack PDF",
      "Confirm next meeting",
      "Add lead to Pilot Requests"
    ]
  };
}

export function getClosingFramework() {
  return [
    "Recommend a 30-day pilot",
    "Confirm branch count",
    "Confirm data sources",
    "Agree success metrics",
    "Schedule setup call",
    "Request pilot decision"
  ];
}
