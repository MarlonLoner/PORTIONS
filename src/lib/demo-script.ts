export type DemoScriptStep = {
  title: string;
  duration: string;
  href: string;
  secondaryHref?: string;
  tertiaryHref?: string;
  pageLabel: string;
  say: string;
  pointAt: string;
  buyerQuestion: string;
  transition: string;
};

export function getDemoOpeningScript() {
  return {
    title: "Opening: 60 seconds",
    href: "/demo-script",
    say: "Most pharmacies are not failing because they do not have stock or customers. They are leaking money because the owner cannot see everything clearly enough, early enough. Chronic patients miss refills. Orders sit unpaid. Branches operate differently. Stock risks are discovered late. Staff follow-ups are hard to track. PORTIONS is not trying to replace your POS. It is a Pharmacy Command OS that sits above the day-to-day chaos and gives the owner visibility over patients, orders, branches, stock, follow-ups, and pilot performance.",
    transition: "Let me show you the system the way an owner would experience it."
  };
}

export function getDemoScriptSteps(): DemoScriptStep[] {
  return [
    {
      title: "Public Demo Story",
      duration: "1 minute",
      href: "/demo",
      pageLabel: "Demo",
      say: "This is the story layer. It explains the problem PORTIONS solves before we enter the command system. The big promise is simple: help pharmacy owners move from scattered operations to controlled execution.",
      pointAt: "Pharmacy Command OS positioning, chronic revenue, branch visibility, stock and order control, and 30-day pilot framing.",
      buyerQuestion: "Why does this matter to an owner or executive?",
      transition: "Now let's enter the actual command room."
    },
    {
      title: "Dashboard",
      duration: "2 minutes",
      href: "/dashboard",
      pageLabel: "Dashboard",
      say: "This is the owner's daily command view. Instead of calling branches one by one or waiting for problems to reach them, the owner can see the health of the pharmacy network in one place. The dashboard gives quick visibility into chronic revenue, orders, branches, stock pressure, and the actions that need attention.",
      pointAt: "KPI cards, CEO Morning Brief, and action links to AI Brief, Pilot Command, and Executive Pack.",
      buyerQuestion: "What is happening in my pharmacy today?",
      transition: "The dashboard shows the numbers; the AI Brief explains what matters."
    },
    {
      title: "AI Brief",
      duration: "2 minutes",
      href: "/ai-brief",
      pageLabel: "AI Brief",
      say: "This is designed like a daily CEO/operator briefing. It does not just show data. It turns the data into operational priorities. The owner can quickly see where revenue is at risk, which follow-ups matter, what orders need attention, and what branch or stock issues should be acted on today.",
      pointAt: "Owner-level recommendations, revenue risks, branch actions, stock warnings, and the daily action plan.",
      buyerQuestion: "What should I focus on today?",
      transition: "One of the biggest money leaks in pharmacy is chronic refill behavior, so let's go there."
    },
    {
      title: "Chronic Revenue Engine",
      duration: "2 minutes",
      href: "/patients",
      secondaryHref: "/follow-ups",
      pageLabel: "Patients and Follow-Ups",
      say: "Chronic patients are not just patients. They are recurring revenue relationships. PORTIONS helps the pharmacy see who is due, who is overdue, who is high risk, and who needs attention before the sale disappears. The follow-up queue turns chronic revenue risk into staff action instead of hoping someone remembers to call.",
      pointAt: "Patient KPIs, risk labels, refill timing, patient detail links, urgency groups, suggested actions, and WhatsApp-ready follow-up messages.",
      buyerQuestion: "How do we protect repeat revenue?",
      transition: "Now let's look at orders, because convenience only creates money when payment and fulfillment are controlled."
    },
    {
      title: "Order Pipeline",
      duration: "1.5 minutes",
      href: "/orders",
      pageLabel: "Orders",
      say: "Here we track the order pipeline. WhatsApp orders, website orders, prescription orders, paid orders, packed orders, and anything awaiting payment. The owner can see where money is stuck and where execution is slowing down.",
      pointAt: "Order statuses, awaiting payment, order value, and order details if useful.",
      buyerQuestion: "Where is order revenue getting stuck?",
      transition: "If one branch performs well and another is leaking, the owner needs to see it without guessing."
    },
    {
      title: "Branch Command",
      duration: "1.5 minutes",
      href: "/branches",
      pageLabel: "Branches",
      say: "This is branch visibility. PORTIONS helps compare branch pressure, revenue activity, patient workload, order activity, and operational attention. For multi-branch pharmacies, this is where the owner stops managing by stories and starts managing by signals.",
      pointAt: "Branch cards, the branch needing attention, and the branch detail page if useful.",
      buyerQuestion: "Which branch needs my attention?",
      transition: "Now the other major risk: stock."
    },
    {
      title: "Stock Intelligence",
      duration: "1.5 minutes",
      href: "/stock",
      pageLabel: "Stock",
      say: "Stock problems are expensive because they hurt both cash and customer trust. PORTIONS highlights low stock, near expiry risk, overstock pressure, and items that need action. The goal is not just stock visibility. It is protecting revenue before the customer is disappointed.",
      pointAt: "Low stock, near expiry, overstock, and suggested actions.",
      buyerQuestion: "What stock risks can hurt sales or cash flow?",
      transition: "A good system is only useful if setup is practical, so let's look at onboarding."
    },
    {
      title: "Import And Onboarding Workflow",
      duration: "2 minutes",
      href: "/imports",
      secondaryHref: "/imports/upload",
      tertiaryHref: "/imports/batches",
      pageLabel: "Imports",
      say: "PORTIONS is built for pilot onboarding. We can prepare templates for branches, staff, chronic patients, stock, orders, and follow-up tasks. The upload preview checks the data before it enters the system. Bad rows do not poison the whole batch. The system can validate, review, approve, and then import safely.",
      pointAt: "Import templates, upload preview, saved batches, approval status, and imported batch review.",
      buyerQuestion: "How hard is setup if our data is messy?",
      transition: "Once the data is in, the pilot needs to prove value. That's where the Pilot Command Center comes in."
    },
    {
      title: "Pilot Command Center",
      duration: "1.5 minutes",
      href: "/pilot-command",
      pageLabel: "Pilot Command",
      say: "This is the 30-day pilot control room. It tracks setup progress, data imported, operational activation, risks discovered, value confidence, and the next actions. This is how we avoid a vague pilot. We make the pilot measurable.",
      pointAt: "30-day timeline, pilot KPIs, value created, risk breakdown, and role-based actions.",
      buyerQuestion: "How do we know the pilot is working?",
      transition: "Executives need a shareable boardroom artifact."
    },
    {
      title: "Executive Export Pack",
      duration: "1.5 minutes",
      href: "/executive-pack",
      pageLabel: "Executive Pack",
      say: "This is the boardroom-ready pilot review. It packages the key evidence: imported data, chronic retention, orders, branch performance, stock risks, staff execution, value created, and rollout recommendation. It can be printed or saved as a PDF.",
      pointAt: "Executive summary, charts, rollout recommendation, and the Print / Save as PDF button.",
      buyerQuestion: "What proof do we have before making a rollout decision?",
      transition: "And at the end of the pilot, the owner needs something they can review or share."
    },
    {
      title: "Pilot Close",
      duration: "90 seconds",
      href: "/pilot",
      pageLabel: "Request Pilot",
      say: "The recommended next step is not a big risky rollout. It is a focused 30-day pilot. We import the pharmacy's operating data, activate the command views, agree success metrics, run the pilot, and review the evidence after 7 days and 30 days. The goal is simple: prove where PORTIONS protects revenue, improves follow-up discipline, exposes order leakage, shows stock risks, and gives the owner better control.",
      pointAt: "Pilot request form and setup expectations.",
      buyerQuestion: "What exactly happens next?",
      transition: "Would it make sense to start with one or two branches for 30 days, then review the Executive Pack before deciding on wider rollout?"
    }
  ];
}

export function getObjectionResponses() {
  return [
    {
      objection: "We already use ProPharm.",
      response: "PORTIONS is not replacing your POS. It sits above POS and operational data to show revenue risk, follow-up discipline, branch performance, and what managers should do next."
    },
    {
      objection: "Our data is messy.",
      response: "That is exactly why the pilot starts with templates, upload preview, validation, and batch review before anything becomes live operating data."
    },
    {
      objection: "Staff may not use this.",
      response: "The pilot focuses on practical daily queues: who to call, which order is stuck, what stock needs action, and what the branch manager must clear today."
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
      response: "The Executive Pack shows payment leakage, chronic revenue protected, stock risk flagged, branch bottlenecks, and workload activated so value can be reviewed before any rollout decision."
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
    "Recommend a focused 30-day pilot, not a risky full rollout",
    "Confirm one or two starting branches",
    "Confirm operating data sources for import",
    "Agree success metrics for chronic revenue, orders, stock, and follow-ups",
    "Schedule setup call and first 7-day evidence review",
    "Close on the question: start small, review the Executive Pack, then decide on rollout"
  ];
}
