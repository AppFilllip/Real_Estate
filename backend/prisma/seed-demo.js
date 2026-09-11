/* eslint-disable no-console */
// ---------------------------------------------------------------------------
// EstateOS — demo / test data seed.
//
//   npm run seed:demo
//
// Currency: INR only. Every money field in the schema is BigInt *paise*
// (₹1 = 100 paise) — see schema.prisma decision 1. Helpers below take rupees
// (lakh / crore) and convert, so the numbers in this file read like a real
// Indian price list. Company.settingsJson also pins currency = "INR".
//
// The script is idempotent: it wipes every row that belongs to the demo
// company (short code EST) and rebuilds it, so it can be re-run at any time to
// reset a test database. The admin login stays admin@estateos.local /
// Admin@12345 (override with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).
// ---------------------------------------------------------------------------

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");

// On MongoDB, Prisma distinguishes a missing field from an explicit null, and the
// services filter with `deletedAt: null`. Force an explicit null on every
// soft-deletable model so seeded rows are visible to those queries.
const SOFT_DELETE_MODELS = new Set([
  "Block", "Booking", "Broker", "Campaign", "Company", "CostSheet", "CustomFieldDef", "Customer", "Demand",
  "DocumentTemplate", "Driver", "Floor", "IvrFlow", "Lead", "LeadSource", "Note", "Offer", "PaymentPlanTemplate",
  "PhoneNumber", "Project", "RateCard", "Receipt", "Role", "Sequence", "SiteVisit", "Task", "Team", "Template", "Ticket",
  "Unit", "User", "Webhook",
]);

const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      create({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args.data = { deletedAt: null, ...args.data };
        return query(args);
      },
      createMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) args.data = [].concat(args.data).map((row) => ({ deletedAt: null, ...row }));
        return query(args);
      },
      upsert({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          args.create = { deletedAt: null, ...args.create };
          args.update = { deletedAt: null, ...args.update };
        }
        return query(args);
      },
    },
  },
});

// ---------------------------------------------------------------------------
// Money helpers — INR paise as BigInt
// ---------------------------------------------------------------------------
const CURRENCY = "INR";
const rupees = (amount) => BigInt(Math.round(amount)) * 100n;
const lakh = (n) => rupees(n * 100000);
const crore = (n) => rupees(n * 10000000);
const pct = (amountPaise, percent) => (amountPaise * BigInt(Math.round(percent * 100))) / 10000n;
const inr = (paise) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(
    Number(paise) / 100
  );

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const NOW = new Date();
const daysAgo = (n, hour = 10) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const daysFromNow = (n, hour = 11) => daysAgo(-n, hour);
const todayAt = (hour) => daysAgo(0, hour);

// ---------------------------------------------------------------------------
// Deterministic pseudo-random so the data set is the same on every run
// ---------------------------------------------------------------------------
let seedState = 20260909;
function rand() {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

// ---------------------------------------------------------------------------
// Static reference data
// ---------------------------------------------------------------------------
const ROLES = [
  { code: "SUPER_ADMIN", name: "Super Admin", isSystem: true, permissionsJson: { "*": ["C", "R", "U", "D", "A"] } },
  { code: "DIRECTOR", name: "Director", isSystem: true, permissionsJson: { "*": ["R", "A"], scope: "all" } },
  {
    code: "SALES_HEAD",
    name: "Sales Head",
    isSystem: true,
    permissionsJson: {
      leads: ["C", "R", "U", "A"],
      bookings: ["C", "R", "U", "A"],
      units: ["R", "U"],
      "site-visits": ["C", "R", "U"],
      calls: ["R"],
      brokers: ["R", "U"],
      reports: ["R"],
      approvals: ["A"],
      scope: "all",
    },
  },
  {
    code: "TEAM_LEAD",
    name: "Team Lead",
    isSystem: true,
    permissionsJson: {
      leads: ["C", "R", "U"],
      bookings: ["C", "R", "U"],
      units: ["R"],
      "site-visits": ["C", "R", "U"],
      calls: ["R"],
      reports: ["R"],
      scope: "team",
    },
  },
  {
    code: "SALES_EXEC",
    name: "Sales Executive",
    isSystem: true,
    permissionsJson: {
      leads: ["C", "R", "U"],
      bookings: ["C", "R"],
      units: ["R"],
      "site-visits": ["C", "R", "U"],
      calls: ["C", "R"],
      scope: "own",
    },
  },
  {
    code: "PRESALES",
    name: "Pre-sales",
    isSystem: true,
    permissionsJson: { leads: ["C", "R", "U"], "site-visits": ["C", "R"], calls: ["C", "R"], scope: "all", fields: { leadPhone: true } },
  },
  {
    code: "CRM_EXEC",
    name: "CRM Executive",
    isSystem: true,
    permissionsJson: { customers: ["R", "U"], conversations: ["C", "R", "U"], tickets: ["C", "R", "U"], bookings: ["R"], scope: "all" },
  },
  {
    code: "ACCOUNTS",
    name: "Accounts",
    isSystem: true,
    permissionsJson: {
      demands: ["C", "R", "U"],
      receipts: ["C", "R", "U"],
      refunds: ["C", "R", "U", "A"],
      ledger: ["R"],
      reports: ["R"],
      scope: "all",
    },
  },
  {
    code: "MARKETING",
    name: "Marketing",
    isSystem: true,
    permissionsJson: { campaigns: ["C", "R", "U", "D"], templates: ["C", "R", "U"], leads: ["R"], reports: ["R"], scope: "all" },
  },
  {
    code: "INVENTORY_ADMIN",
    name: "Inventory Admin",
    isSystem: true,
    permissionsJson: { projects: ["C", "R", "U"], units: ["C", "R", "U"], "rate-cards": ["C", "R", "U"], scope: "all" },
  },
];

const USERS = [
  // email, name, phone, role, team
  { key: "director", name: "Rajesh Agarwal", email: "rajesh.agarwal@estateos.local", phone: "9829011001", role: "DIRECTOR" },
  { key: "salesHead", name: "Priya Sharma", email: "priya.sharma@estateos.local", phone: "9829011002", role: "SALES_HEAD", team: "Sales" },
  { key: "tlA", name: "Vikram Singh Rathore", email: "vikram.rathore@estateos.local", phone: "9829011003", role: "TEAM_LEAD", team: "Team A", manager: "salesHead" },
  { key: "tlB", name: "Neha Gupta", email: "neha.gupta@estateos.local", phone: "9829011004", role: "TEAM_LEAD", team: "Team B", manager: "salesHead" },
  { key: "exec1", name: "Amit Kumar Meena", email: "amit.meena@estateos.local", phone: "9829011005", role: "SALES_EXEC", team: "Team A", manager: "tlA" },
  { key: "exec2", name: "Sunita Choudhary", email: "sunita.choudhary@estateos.local", phone: "9829011006", role: "SALES_EXEC", team: "Team A", manager: "tlA" },
  { key: "exec3", name: "Rohit Jain", email: "rohit.jain@estateos.local", phone: "9829011007", role: "SALES_EXEC", team: "Team B", manager: "tlB" },
  { key: "exec4", name: "Pooja Saini", email: "pooja.saini@estateos.local", phone: "9829011008", role: "SALES_EXEC", team: "Team B", manager: "tlB" },
  { key: "presales", name: "Kavita Yadav", email: "kavita.yadav@estateos.local", phone: "9829011009", role: "PRESALES", team: "Pre-sales" },
  { key: "crm", name: "Manish Soni", email: "manish.soni@estateos.local", phone: "9829011010", role: "CRM_EXEC", team: "CRM" },
  { key: "accounts", name: "Deepak Khandelwal", email: "deepak.khandelwal@estateos.local", phone: "9829011011", role: "ACCOUNTS", team: "Accounts" },
  { key: "marketing", name: "Ritu Bhargava", email: "ritu.bhargava@estateos.local", phone: "9829011012", role: "MARKETING", team: "Marketing" },
  { key: "inventory", name: "Suresh Verma", email: "suresh.verma@estateos.local", phone: "9829011013", role: "INVENTORY_ADMIN" },
];

const TEAMS = ["Sales", "Team A", "Team B", "Pre-sales", "CRM", "Accounts", "Marketing"];

const LEAD_SOURCES = [
  { name: "Website", group: "Digital", scoreWeight: 10 },
  { name: "99acres", group: "Portal", scoreWeight: 10 },
  { name: "MagicBricks", group: "Portal", scoreWeight: 10 },
  { name: "Housing.com", group: "Portal", scoreWeight: 10 },
  { name: "Meta Ads", group: "Digital", scoreWeight: 10 },
  { name: "Google Ads", group: "Digital", scoreWeight: 10 },
  { name: "Referral", group: "Organic", scoreWeight: 20 },
  { name: "Walk-in", group: "Organic", scoreWeight: 25 },
  { name: "IVR", group: "Phone", scoreWeight: 15 },
  { name: "Broker", group: "Channel Partner", scoreWeight: 15 },
  { name: "Hoarding", group: "Offline", scoreWeight: 8 },
  { name: "Newspaper", group: "Offline", scoreWeight: 8 },
];

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Sai", "Arjun", "Reyansh", "Ishaan", "Kabir", "Dhruv", "Krishna", "Ananya", "Diya", "Saanvi", "Aadhya", "Kiara", "Pari", "Myra", "Riya", "Ira", "Anika", "Mohammed", "Ayaan", "Farhan", "Zara", "Harpreet", "Gurpreet", "Manpreet", "Simran", "Ramesh", "Suresh", "Mahesh", "Dinesh", "Lokesh", "Naresh", "Kamlesh", "Rakesh", "Sunil", "Anil", "Vinod", "Pramod", "Sarita", "Geeta", "Seema", "Reena", "Meena", "Nisha", "Asha", "Usha", "Kiran", "Rekha"];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Agarwal", "Jain", "Meena", "Choudhary", "Yadav", "Saini", "Rathore", "Shekhawat", "Kumawat", "Soni", "Khandelwal", "Goyal", "Mittal", "Bhargava", "Joshi", "Pareek", "Vyas", "Purohit", "Gurjar", "Bairwa", "Kumar", "Singh", "Khan", "Ansari", "Qureshi", "Sethi", "Malhotra"];
const CITIES = ["Jaipur", "Jaipur", "Jaipur", "Jaipur", "Ajmer", "Sikar", "Alwar", "Kota", "Jodhpur", "Delhi", "Gurugram", "Mumbai", "Bengaluru", "Ahmedabad"];
const TIMELINES = ["Immediate", "1-3 months", "3-6 months", "6+ months"];
const PURPOSES = ["Self use", "Investment", "Self use", "Investment", "Rental income"];

const fullName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
let phoneCounter = 0;
const nextPhone = () => `98${String(29100000 + phoneCounter++).padStart(8, "0")}`;

// ---------------------------------------------------------------------------
// Wipe every row belonging to the demo company
// ---------------------------------------------------------------------------
// Prisma emulates referential integrity on MongoDB (relationMode = prisma), so
// rows must go children-first and every cycle has to be broken before deleting.
const COMPANY_SCOPED_MODELS = [
  "customFieldValue", "customFieldDef", "apiKey", "webhook", "auditLog", "notificationPreference", "notification",
  "callback", "voicemail", "recording", "call", "message", "conversation", "broadcast", "enrolment", "sequenceStep",
  "sequence", "generatedDocument", "documentTemplate", "template",
  "leadDispute", "commission", "ticket", "ledger", "refund", "receiptAllocation", "receipt", "demand", "kycDocument",
  "applicant", "paymentPlan", "paymentPlanTemplate",
  "task", "note", "activity", "negotiation", "siteVisitOutcome", "siteVisit",
  "booking", "token", "hold", "costSheet", "offer", "approvalRequest",
  "leadShortlist", "leadRequirement", "lead", "customer", "campaign", "leadSource", "brokerProject", "broker",
  "phoneNumber", "ivrFlowVersion", "ivrFlow", "milestone", "driver",
  "unitStatusHistory", "unitPolygon", "unit", "floor", "block", "plc", "rateCardCharge", "rateCard", "projectMember",
  "project", "user", "team", "permission", "role",
];

async function breakCycles(companyId) {
  const where = { companyId };
  await prisma.team.updateMany({ where, data: { parentId: null, leadUserId: null } });
  await prisma.user.updateMany({ where, data: { managerId: null, teamId: null, outboundLineId: null } });
  await prisma.lead.updateMany({ where, data: { mergedIntoId: null, customerId: null } });
  await prisma.siteVisit.updateMany({ where, data: { rescheduledFromId: null } });
  // campaign.trackingNumberId is a non-sparse unique index on Mongo, so it cannot
  // be nulled in bulk; campaigns are deleted before phone numbers instead.
  await prisma.phoneNumber.updateMany({ where, data: { campaignId: null, ivrFlowId: null } });
}

async function wipeCompany(companyId) {
  await breakCycles(companyId);
  // Session has no companyId of its own — it only points at a User — so it must
  // be cleared before the "user" deleteMany below or Mongo's emulated
  // referential integrity (relationMode = prisma) rejects the user delete.
  const companyUserIds = (await prisma.user.findMany({ where: { companyId }, select: { id: true } })).map((u) => u.id);
  if (companyUserIds.length) {
    await prisma.session.deleteMany({ where: { userId: { in: companyUserIds } } });
  }
  for (const model of COMPANY_SCOPED_MODELS) {
    const delegate = prisma[model];
    if (!delegate) continue;
    if (model === "rateCardCharge") {
      const cards = await prisma.rateCard.findMany({ where: { companyId }, select: { id: true } });
      await delegate.deleteMany({ where: { rateCardId: { in: cards.map((c) => c.id) } } });
    } else if (model === "permission") {
      const roles = await prisma.role.findMany({ where: { companyId }, select: { id: true } });
      await delegate.deleteMany({ where: { roleId: { in: roles.map((r) => r.id) } } });
    } else if (model === "projectMember") {
      const projects = await prisma.project.findMany({ where: { companyId }, select: { id: true } });
      await delegate.deleteMany({ where: { projectId: { in: projects.map((p) => p.id) } } });
    } else {
      await delegate.deleteMany({ where: { companyId } });
    }
  }
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------
async function seedCompany() {
  return prisma.company.upsert({
    where: { shortCode: "EST" },
    update: {
      name: "EstateOS Demo",
      legalName: "EstateOS Demo Realty Pvt Ltd",
      gstin: "08AABCE1234F1Z5",
      pan: "AABCE1234F",
      reraPromoterNo: "RAJ/P/2024/001234",
      addressJson: { line1: "3rd Floor, Crystal Palm", line2: "Sardar Patel Marg, C-Scheme", city: "Jaipur", state: "Rajasthan", pincode: "302001", country: "India" },
      signatoriesJson: [{ name: "Rajesh Agarwal", designation: "Director" }],
      workingHoursJson: { mon_sat: ["10:00", "19:00"], sun: ["11:00", "17:00"] },
      holidaysJson: ["2026-10-02", "2026-10-20", "2026-11-08", "2026-12-25"],
      settingsJson: { currency: CURRENCY, locale: "en-IN", timezone: "Asia/Kolkata", moneyUnit: "paise", areaUnit: "SQ_YD", gstPct: 5, stampDutyMalePct: 6, stampDutyFemalePct: 5, registrationPct: 1 },
    },
    create: {
      name: "EstateOS Demo",
      legalName: "EstateOS Demo Realty Pvt Ltd",
      shortCode: "EST",
      settingsJson: { currency: CURRENCY, locale: "en-IN", timezone: "Asia/Kolkata", moneyUnit: "paise" },
    },
  });
}

async function seedRolesAndUsers(companyId) {
  const roles = {};
  for (const r of ROLES) {
    roles[r.code] = await prisma.role.create({ data: { companyId, ...r } });
  }

  const teams = {};
  for (const name of TEAMS) {
    teams[name] = await prisma.team.create({ data: { companyId, name, parentId: name.startsWith("Team ") ? undefined : undefined } });
  }
  // Team A / Team B sit under Sales
  for (const name of ["Team A", "Team B"]) {
    teams[name] = await prisma.team.update({ where: { id: teams[name].id }, data: { parentId: teams.Sales.id } });
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@estateos.local").trim().toLowerCase();
  const passwordHash = await hashPassword(process.env.SEED_ADMIN_PASSWORD || "Admin@12345");
  const userPasswordHash = await hashPassword(process.env.SEED_USER_PASSWORD || "Password@123");

  const users = {};
  users.admin = await prisma.user.create({
    data: { companyId, roleId: roles.SUPER_ADMIN.id, name: "Admin", email: adminEmail, phone: "9999999999", passwordHash, status: "ACTIVE", lastLoginAt: NOW },
  });

  for (const u of USERS) {
    users[u.key] = await prisma.user.create({
      data: {
        companyId,
        roleId: roles[u.role].id,
        teamId: u.team ? teams[u.team].id : undefined,
        managerId: u.manager ? users[u.manager].id : undefined,
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash: userPasswordHash,
        status: "ACTIVE",
        shiftStart: "10:00",
        shiftEnd: "19:00",
        dailyLeadCap: u.role === "SALES_EXEC" ? 15 : undefined,
        targetsJson: u.role === "SALES_EXEC" ? { leads: 120, visits: 30, bookings: 5, value: crore(3).toString() } : undefined,
        preferencesJson: { currency: CURRENCY, locale: "en-IN" },
        lastLoginAt: daysAgo(between(0, 5)),
      },
    });
  }

  await prisma.team.update({ where: { id: teams.Sales.id }, data: { leadUserId: users.salesHead.id, targetsJson: { bookings: 40, value: crore(25).toString() } } });
  await prisma.team.update({ where: { id: teams["Team A"].id }, data: { leadUserId: users.tlA.id, targetsJson: { bookings: 20, value: crore(12).toString() } } });
  await prisma.team.update({ where: { id: teams["Team B"].id }, data: { leadUserId: users.tlB.id, targetsJson: { bookings: 20, value: crore(13).toString() } } });

  return { roles, teams, users };
}

const PROJECTS = [
  {
    key: "GV2",
    name: "Green Valley Phase 2",
    shortCode: "GV2",
    ownershipType: "OWN",
    type: "PLOTS",
    status: "SELLING",
    hierarchyTemplate: "PLOTS",
    locality: "Ajmer Road, Mahapura",
    pincode: "302026",
    latitude: 26.8467,
    longitude: 75.6478,
    reraNumber: "RAJ/P/2024/002811",
    reraValidTill: new Date("2028-03-31"),
    approvalAuthority: "JDA",
    approvalNumber: "JDA/2024/PLN/1183",
    landArea: 25.4,
    landAreaUnit: "ACRE",
    launchDate: daysAgo(240),
    possessionDate: new Date("2027-06-30"),
    minTokenAmount: lakh(1),
    defaultBrokeragePct: 2,
    visibleToBrokers: true,
    showPricesToBrokers: true,
    amenitiesJson: ["Gated community", "40ft & 60ft roads", "Underground drainage", "Park", "Temple", "24x7 security"],
    bankTieUpsJson: ["SBI", "HDFC Bank", "ICICI Bank", "Bank of Baroda"],
    pricingBasis: "PER_SQ_YD",
    baseRate: rupees(18500), // ₹18,500 per sq yd
    blocks: [
      { name: "Block A", code: "A", count: 24 },
      { name: "Block B", code: "B", count: 24 },
      { name: "Block C", code: "C", count: 18 },
    ],
    unitSizes: [
      { sqyd: 111, l: 30, w: 33.3 },
      { sqyd: 150, l: 30, w: 45 },
      { sqyd: 200, l: 40, w: 45 },
      { sqyd: 222, l: 40, w: 50 },
      { sqyd: 300, l: 45, w: 60 },
    ],
    milestones: ["Land levelling", "Roads & drainage", "Electrification", "Park & landscaping", "Handover"],
  },
  {
    key: "SKY",
    name: "Skyline Heights",
    shortCode: "SKY",
    ownershipType: "OWN",
    type: "APARTMENTS",
    status: "LAUNCHED",
    hierarchyTemplate: "APARTMENTS",
    locality: "Vaishali Nagar Extension",
    pincode: "302021",
    latitude: 26.9124,
    longitude: 75.7305,
    reraNumber: "RAJ/P/2025/003402",
    reraValidTill: new Date("2029-12-31"),
    approvalAuthority: "JDA",
    approvalNumber: "JDA/2025/BLD/0921",
    landArea: 4.2,
    landAreaUnit: "ACRE",
    launchDate: daysAgo(60),
    possessionDate: new Date("2029-03-31"),
    minTokenAmount: lakh(2),
    defaultBrokeragePct: 1.5,
    visibleToBrokers: true,
    showPricesToBrokers: false,
    amenitiesJson: ["Clubhouse", "Swimming pool", "Gym", "Kids play area", "Covered parking", "Power backup"],
    bankTieUpsJson: ["HDFC Bank", "Axis Bank", "LIC HFL"],
    pricingBasis: "PER_SQ_FT",
    baseRate: rupees(5200), // ₹5,200 per sq ft
    blocks: [
      { name: "Tower T1", code: "T1", floors: 8, perFloor: 4 },
      { name: "Tower T2", code: "T2", floors: 8, perFloor: 4 },
    ],
    unitSizes: [
      { sqft: 1150, type: "2BHK" },
      { sqft: 1450, type: "3BHK" },
      { sqft: 1650, type: "3BHK+Study" },
      { sqft: 1150, type: "2BHK" },
    ],
    milestones: ["Excavation", "Plinth", "5th slab", "Roof slab", "Finishing", "Handover"],
  },
  {
    key: "RVL",
    name: "Royal Villas",
    shortCode: "RVL",
    ownershipType: "PARTNER",
    developerName: "Shree Balaji Developers",
    type: "VILLAS",
    status: "UPCOMING",
    hierarchyTemplate: "VILLAS",
    locality: "Sirsi Road, Jhotwara",
    pincode: "302012",
    latitude: 26.9536,
    longitude: 75.7301,
    reraNumber: null,
    landArea: 8.5,
    landAreaUnit: "ACRE",
    launchDate: daysFromNow(45),
    possessionDate: new Date("2028-12-31"),
    minTokenAmount: lakh(2),
    defaultBrokeragePct: 2,
    visibleToBrokers: false,
    amenitiesJson: ["Private garden", "Modular kitchen", "Gated community", "Clubhouse"],
    pricingBasis: "LUMP_SUM",
    baseRate: crore(1.25), // ₹1.25 Cr lump sum per villa
    blocks: [{ name: "Row A", code: "A", count: 12 }],
    unitSizes: [{ sqyd: 180, l: 36, w: 45 }],
    milestones: ["Foundation", "Structure", "Finishing", "Handover"],
  },
];

async function seedProjects(companyId, users) {
  const projects = {};
  for (const p of PROJECTS) {
    const { blocks, unitSizes, milestones, pricingBasis, baseRate, key, ...projectData } = p;
    const project = await prisma.project.create({
      data: { companyId, city: "Jaipur", state: "Rajasthan", createdById: users.inventory.id, ...projectData },
    });

    // Sales team on the project
    const memberKeys = key === "RVL" ? ["salesHead", "tlB", "exec3", "exec4"] : ["salesHead", "tlA", "tlB", "exec1", "exec2", "exec3", "exec4", "presales"];
    for (const k of memberKeys) {
      await prisma.projectMember.create({ data: { projectId: project.id, userId: users[k].id, inRoundRobin: k !== "salesHead" } });
    }

    // Rate cards: v1 archived, v2 published
    const v1 = await prisma.rateCard.create({
      data: {
        companyId, projectId: project.id, version: 1, status: "ARCHIVED", pricingBasis,
        baseRate: (baseRate * 95n) / 100n, effectiveFrom: daysAgo(200), publishedAt: daysAgo(200), publishedById: users.director.id, createdById: users.inventory.id,
      },
    });
    const rateCard = await prisma.rateCard.create({
      data: {
        companyId, projectId: project.id, version: 2, status: p.status === "UPCOMING" ? "DRAFT" : "PUBLISHED", pricingBasis, baseRate,
        effectiveFrom: daysAgo(90), publishedAt: p.status === "UPCOMING" ? null : daysAgo(90), publishedById: p.status === "UPCOMING" ? null : users.director.id, createdById: users.inventory.id,
      },
    });
    const charges = p.type === "APARTMENTS"
      ? [
          { name: "Covered car parking", basis: "FIXED", amount: lakh(3), taxable: true, gstPct: 5 },
          { name: "Club membership", basis: "FIXED", amount: lakh(1.5), taxable: true, gstPct: 18 },
          { name: "External development charges", basis: "PER_AREA", amount: rupees(150), taxable: true, gstPct: 18 },
          { name: "Power backup (per KVA)", basis: "FIXED", amount: rupees(25000), taxable: true, gstPct: 18 },
          { name: "Interest-free maintenance security", basis: "PER_AREA", amount: rupees(50), taxable: false },
        ]
      : [
          { name: "Development charges", basis: "PER_AREA", amount: rupees(500), taxable: true, gstPct: 18 },
          { name: "Club membership", basis: "FIXED", amount: rupees(50000), taxable: true, gstPct: 18 },
          { name: "Electricity connection", basis: "FIXED", amount: rupees(25000), taxable: false },
          { name: "Maintenance deposit", basis: "PER_AREA", amount: rupees(100), taxable: false },
        ];
    for (const [i, c] of charges.entries()) {
      await prisma.rateCardCharge.create({ data: { rateCardId: rateCard.id, sortOrder: i, ...c } });
      await prisma.rateCardCharge.create({ data: { rateCardId: v1.id, sortOrder: i, ...c } });
    }

    // PLCs
    const plcs = p.type === "APARTMENTS"
      ? [
          { name: "Park facing", attributeKey: "PARK_FACING", type: "PERCENT", value: 500n },
          { name: "Corner flat", attributeKey: "CORNER", type: "PERCENT", value: 300n },
          { name: "Floor rise (per sq ft, above 4th)", attributeKey: "HIGH_FLOOR", type: "FIXED_PER_AREA", value: rupees(50) },
        ]
      : [
          { name: "Corner plot", attributeKey: "CORNER", type: "PERCENT", value: 500n },
          { name: "Park facing", attributeKey: "PARK_FACING", type: "PERCENT", value: 500n },
          { name: "60 ft road", attributeKey: "ROAD_60FT", type: "PERCENT", value: 300n },
          { name: "East facing", attributeKey: "EAST_FACING", type: "PERCENT", value: 200n },
        ];
    for (const plc of plcs) {
      await prisma.plc.create({ data: { companyId, projectId: project.id, ...plc } });
    }

    // Milestones
    const milestoneRows = [];
    for (const [i, name] of milestones.entries()) {
      const completed = p.status === "SELLING" ? i < 2 : p.status === "LAUNCHED" ? i < 1 : false;
      milestoneRows.push(
        await prisma.milestone.create({
          data: {
            companyId, projectId: project.id, name, sortOrder: i,
            plannedDate: daysFromNow(90 * (i + 1) - 180), actualDate: completed ? daysAgo(150 - i * 60) : null,
            status: completed ? "COMPLETED" : "PLANNED", completedById: completed ? users.inventory.id : null,
          },
        })
      );
    }

    // Blocks / floors / units
    const units = [];
    for (const [bi, b] of blocks.entries()) {
      const block = await prisma.block.create({ data: { companyId, projectId: project.id, name: b.name, code: b.code, sortOrder: bi } });

      if (p.type === "APARTMENTS") {
        for (let f = 1; f <= b.floors; f++) {
          const floor = await prisma.floor.create({ data: { companyId, blockId: block.id, number: f, name: `Floor ${f}` } });
          for (let n = 1; n <= b.perFloor; n++) {
            const size = unitSizes[(n - 1) % unitSizes.length];
            const number = `${f}0${n}`;
            const attrs = [];
            if (n === 1 || n === b.perFloor) attrs.push("CORNER");
            if (n <= 2) attrs.push("PARK_FACING");
            if (f > 4) attrs.push("HIGH_FLOOR");
            units.push(
              await prisma.unit.create({
                data: {
                  companyId, projectId: project.id, blockId: block.id, floorId: floor.id,
                  unitCode: `${p.shortCode}-${b.code}-${number}`, number,
                  area: size.sqft, areaUnit: "SQ_FT", superArea: size.sqft, builtUpArea: Math.round(size.sqft * 0.85), carpetArea: Math.round(size.sqft * 0.72),
                  facing: pick(["NORTH", "EAST", "NORTH_EAST", "SOUTH", "WEST"]), parkingCount: size.sqft > 1400 ? 2 : 1,
                  attributesJson: attrs, viewNote: size.type, status: "AVAILABLE", availableSince: p.launchDate,
                },
              })
            );
          }
        }
      } else {
        for (let n = 1; n <= b.count; n++) {
          const size = unitSizes[(n - 1) % unitSizes.length];
          const number = String(n).padStart(3, "0");
          const attrs = [];
          if (n === 1 || n === b.count || n % 12 === 0) attrs.push("CORNER");
          if (n % 7 === 0) attrs.push("PARK_FACING");
          const roadWidth = n % 5 === 0 ? 60 : n % 2 === 0 ? 40 : 30;
          if (roadWidth === 60) attrs.push("ROAD_60FT");
          const facing = pick(["NORTH", "EAST", "SOUTH", "WEST", "NORTH_EAST", "SOUTH_EAST"]);
          if (facing === "EAST") attrs.push("EAST_FACING");
          const notForSale = p.key === "GV2" && b.code === "C" && n > 15;
          units.push(
            await prisma.unit.create({
              data: {
                companyId, projectId: project.id, blockId: block.id,
                unitCode: `${p.shortCode}-${b.code}-${number}`, number,
                area: size.sqyd, areaUnit: "SQ_YD", lengthFt: size.l, widthFt: size.w, facing, roadWidthFt: roadWidth,
                attributesJson: attrs,
                status: notForSale ? "NOT_FOR_SALE" : "AVAILABLE",
                notForSaleReason: notForSale ? "LANDOWNER_SHARE" : null,
                availableSince: notForSale ? null : p.launchDate,
              },
            })
          );
        }
      }
    }

    projects[key] = { ...project, key, rateCard, units, milestoneRows, pricingBasis, baseRate, plcs, charges };
  }
  return projects;
}

async function seedLeadSourcesAndCampaigns(companyId, projects) {
  const sources = {};
  for (const s of LEAD_SOURCES) {
    sources[s.name] = await prisma.leadSource.create({ data: { companyId, ...s } });
  }

  const campaigns = {};
  const campaignDefs = [
    { name: "GV2 Diwali Launch Offer", channel: "META", project: "GV2", source: "Meta Ads", budget: lakh(8), spend: lakh(5.6), start: daysAgo(45), end: daysFromNow(30) },
    { name: "GV2 Search - Plots Ajmer Road", channel: "GOOGLE", project: "GV2", source: "Google Ads", budget: lakh(4), spend: lakh(3.1), start: daysAgo(90), end: daysFromNow(60) },
    { name: "Skyline Pre-launch 99acres", channel: "PORTAL", project: "SKY", source: "99acres", budget: lakh(3), spend: lakh(2.4), start: daysAgo(60), end: daysFromNow(15) },
    { name: "Skyline Hoarding - Vaishali", channel: "HOARDING", project: "SKY", source: "Hoarding", budget: lakh(6), spend: lakh(6), start: daysAgo(50), end: daysFromNow(40) },
    { name: "Dainik Bhaskar Weekend Ad", channel: "NEWSPAPER", project: null, source: "Newspaper", budget: lakh(2.5), spend: lakh(2.5), start: daysAgo(20), end: daysAgo(6) },
    { name: "Broker Meet - Sept 2026", channel: "EVENT", project: "GV2", source: "Broker", budget: lakh(1.5), spend: lakh(1.2), start: daysAgo(10), end: daysAgo(10) },
    { name: "Customer Referral Programme", channel: "REFERRAL", project: null, source: "Referral", budget: lakh(5), spend: lakh(1.8), start: daysAgo(180), end: daysFromNow(180) },
  ];
  // Mongo unique indexes treat null as a value, so every campaign gets its own
  // IVR tracking DID (which is what §13.1 expects anyway).
  for (const [i, c] of campaignDefs.entries()) {
    const trackingNumber = await prisma.phoneNumber.create({
      data: {
        companyId, projectId: c.project ? projects[c.project].id : undefined,
        number: `+91141400${String(1001 + i)}`, label: `${c.name} — tracking`, purpose: "CAMPAIGN", provider: "EXOTEL",
        providerNumberSid: `exo_${1001 + i}`, monthlyCost: rupees(1500),
      },
    });
    campaigns[c.name] = await prisma.campaign.create({
      data: {
        companyId, name: c.name, channel: c.channel, projectId: c.project ? projects[c.project].id : undefined,
        sourceId: sources[c.source].id, budget: c.budget, spend: c.spend, startDate: c.start, endDate: c.end,
        trackingNumberId: trackingNumber.id,
        utmJson: { utm_source: c.channel.toLowerCase(), utm_campaign: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      },
    });
    await prisma.phoneNumber.update({ where: { id: trackingNumber.id }, data: { campaignId: campaigns[c.name].id } });
  }
  // Sales lines the execs dial out on
  await prisma.phoneNumber.create({ data: { companyId, number: "+911414001000", label: "Main sales line", purpose: "SALES", monthlyCost: rupees(2500) } });
  await prisma.phoneNumber.create({ data: { companyId, number: "+911414001099", label: "Collections desk", purpose: "COLLECTIONS", monthlyCost: rupees(1500) } });
  return { sources, campaigns };
}

async function seedBrokers(companyId, projects) {
  const defs = [
    { firmName: "Jaipur Property Hub", contactPerson: "Mukesh Agarwal", phone: "9414001001", email: "mukesh@jaipurpropertyhub.in", tier: "GOLD", status: "ACTIVE", reraAgentNo: "RAJ/A/2023/0451", gstNumber: "08AAECJ4521K1ZP" },
      { firmName: "Rathore Realtors", contactPerson: "Bhanwar Singh Rathore", phone: "9414001002", email: "bhanwar@rathorerealtors.com", tier: "GOLD", status: "ACTIVE", reraAgentNo: "RAJ/A/2022/0287" },
    { firmName: "Pink City Estates", contactPerson: "Sanjay Khandelwal", phone: "9414001003", email: "sanjay@pinkcityestates.in", tier: "SILVER", status: "ACTIVE", reraAgentNo: "RAJ/A/2024/0612" },
    { firmName: "Dream Homes Consultants", contactPerson: "Farida Khan", phone: "9414001004", email: "farida@dreamhomes.in", tier: "SILVER", status: "ACTIVE" },
    { firmName: null, contactPerson: "Ravi Kumawat", phone: "9414001005", email: "ravi.kumawat@gmail.com", tier: "BRONZE", status: "ACTIVE" },
    { firmName: "Shubh Properties", contactPerson: "Anita Goyal", phone: "9414001006", email: "anita@shubhproperties.in", tier: "BRONZE", status: "PENDING" },
    { firmName: "Marwar Land Deals", contactPerson: "Devendra Purohit", phone: "9414001007", email: null, tier: "BRONZE", status: "SUSPENDED" },
  ];
  const brokers = [];
  for (const d of defs) {
    const broker = await prisma.broker.create({
      data: {
        companyId, ...d, address: "Jaipur, Rajasthan", portalAccessEnabled: d.status === "ACTIVE",
        agreementSignedOn: d.status === "ACTIVE" ? daysAgo(between(60, 300)) : null,
      },
    });
    brokers.push(broker);
    if (d.status === "ACTIVE") {
      await prisma.brokerProject.create({ data: { companyId, brokerId: broker.id, projectId: projects.GV2.id, brokeragePct: d.tier === "GOLD" ? 2.5 : 2 } });
      await prisma.brokerProject.create({ data: { companyId, brokerId: broker.id, projectId: projects.SKY.id, brokeragePct: d.tier === "GOLD" ? 2 : 1.5 } });
    }
  }
  return brokers;
}

async function seedDrivers(companyId) {
  const drivers = [];
  for (const d of [
    { name: "Shyam Lal", phone: "9829055001", vehicleNumber: "RJ14 CA 4521" },
    { name: "Babu Singh", phone: "9829055002", vehicleNumber: "RJ14 TA 8890" },
    { name: "Ramji Gurjar", phone: "9829055003", vehicleNumber: "RJ14 CB 1123", active: false },
  ]) {
    drivers.push(await prisma.driver.create({ data: { companyId, ...d } }));
  }
  return drivers;
}

// Cost sheet arithmetic (mirrors the schema: everything paise)
function computeCostSheet(project, unit, applicantGender, discountPct = 0) {
  const area = BigInt(Math.round(unit.area));
  const baseCost = project.pricingBasis === "LUMP_SUM" ? project.baseRate : project.baseRate * area;

  let plcTotal = 0n;
  const plcLines = [];
  for (const plc of project.plcs) {
    if (!(unit.attributesJson || []).includes(plc.attributeKey)) continue;
    let amt = 0n;
    if (plc.type === "PERCENT") amt = (baseCost * plc.value) / 10000n;
    else if (plc.type === "FIXED_PER_AREA") amt = plc.value * area;
    else amt = plc.value;
    plcTotal += amt;
    plcLines.push({ label: plc.name, amount: amt.toString() });
  }

  let chargesTotal = 0n;
  let gstAmount = 0n;
  const chargeLines = [];
  for (const c of project.charges) {
    const amt = c.basis === "PER_AREA" ? c.amount * area : c.basis === "PERCENT" ? (baseCost * c.amount) / 10000n : c.amount;
    chargesTotal += amt;
    const gst = c.taxable && c.gstPct ? pct(amt, c.gstPct) : 0n;
    gstAmount += gst;
    chargeLines.push({ label: c.name, amount: amt.toString(), gst: gst.toString() });
  }
  // Apartments attract 5% GST on the base + PLC (under-construction); plots do not.
  if (project.type === "APARTMENTS") gstAmount += pct(baseCost + plcTotal, 5);

  const discountAmount = discountPct ? pct(baseCost + plcTotal, discountPct) : 0n;
  const agreementValue = baseCost + plcTotal - discountAmount;
  const stampDutyPct = applicantGender === "FEMALE" ? 5 : 6;
  const stampDuty = pct(agreementValue, stampDutyPct);
  const registration = pct(agreementValue, 1);
  const totalCost = agreementValue + chargesTotal + gstAmount + stampDuty + registration;

  return {
    baseCost, plcTotal, chargesTotal, gstAmount, discountAmount, discountPct: discountPct || null, agreementValue, stampDuty, registration, totalCost,
    breakupJson: {
      currency: CURRENCY,
      unit: unit.unitCode,
      area: unit.area,
      areaUnit: unit.areaUnit,
      rate: project.baseRate.toString(),
      pricingBasis: project.pricingBasis,
      lines: [
        { label: "Basic sale price", amount: baseCost.toString() },
        ...plcLines,
        ...(discountAmount ? [{ label: `Discount ${discountPct}%`, amount: (-discountAmount).toString() }] : []),
        { label: "Agreement value", amount: agreementValue.toString(), bold: true },
        ...chargeLines,
        { label: "GST", amount: gstAmount.toString() },
        { label: `Stamp duty ${stampDutyPct}%`, amount: stampDuty.toString() },
        { label: "Registration 1%", amount: registration.toString() },
        { label: "Total cost", amount: totalCost.toString(), bold: true },
      ],
    },
  };
}

async function seedPaymentPlanTemplates(companyId, projects) {
  const templates = {};
  templates.plots = await prisma.paymentPlanTemplate.create({
    data: {
      companyId, projectId: projects.GV2.id, name: "GV2 Time-linked 30:30:40", type: "TIME_LINKED",
      rowsJson: [
        { label: "Booking amount", pctOfValue: 10, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 0, graceDays: 0 },
        { label: "Within 30 days of booking", pctOfValue: 20, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 30, graceDays: 7, interestPctPa: 12 },
        { label: "Within 90 days of booking", pctOfValue: 30, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 90, graceDays: 7, interestPctPa: 12 },
        { label: "On registration", pctOfValue: 40, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 180, graceDays: 15, interestPctPa: 12 },
      ],
    },
  });
  templates.apartments = await prisma.paymentPlanTemplate.create({
    data: {
      companyId, projectId: projects.SKY.id, name: "Skyline Construction-linked", type: "CONSTRUCTION_LINKED",
      rowsJson: [
        { label: "Booking amount", pctOfValue: 10, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 0 },
        { label: "Within 45 days (agreement)", pctOfValue: 15, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 45, graceDays: 7, interestPctPa: 12 },
        { label: "On excavation", pctOfValue: 10, dueRule: "ON_MILESTONE", milestone: "Excavation", graceDays: 15, interestPctPa: 12 },
        { label: "On plinth", pctOfValue: 15, dueRule: "ON_MILESTONE", milestone: "Plinth", graceDays: 15, interestPctPa: 12 },
        { label: "On 5th slab", pctOfValue: 15, dueRule: "ON_MILESTONE", milestone: "5th slab", graceDays: 15, interestPctPa: 12 },
        { label: "On roof slab", pctOfValue: 15, dueRule: "ON_MILESTONE", milestone: "Roof slab", graceDays: 15, interestPctPa: 12 },
        { label: "On finishing", pctOfValue: 15, dueRule: "ON_MILESTONE", milestone: "Finishing", graceDays: 15, interestPctPa: 12 },
        { label: "On possession", pctOfValue: 5, dueRule: "ON_MILESTONE", milestone: "Handover", graceDays: 0 },
      ],
    },
  });
  templates.downPayment = await prisma.paymentPlanTemplate.create({
    data: {
      companyId, name: "Down payment 10:90", type: "DOWN_PAYMENT",
      rowsJson: [
        { label: "Booking amount", pctOfValue: 10, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 0 },
        { label: "Balance within 45 days", pctOfValue: 90, dueRule: "DAYS_AFTER_BOOKING", daysAfterBooking: 45, graceDays: 7, interestPctPa: 12 },
      ],
    },
  });
  return templates;
}

async function seedOffers(companyId, projects) {
  const offers = [];
  offers.push(await prisma.offer.create({ data: { companyId, name: "Diwali Dhamaka — ₹1 lakh off", type: "AMOUNT_OFF", value: lakh(1), validFrom: daysAgo(30), validTo: daysFromNow(45), projectIdsJson: [projects.GV2.id], autoApply: false } }));
  offers.push(await prisma.offer.create({ data: { companyId, name: "Early bird 2% off", type: "PERCENT_OFF", value: 200n, validFrom: daysAgo(60), validTo: daysFromNow(10), projectIdsJson: [projects.SKY.id], autoApply: true } }));
  offers.push(await prisma.offer.create({ data: { companyId, name: "Free modular kitchen", type: "FREE_ITEM", freeItem: "Modular kitchen worth ₹2.5 lakh", validFrom: daysAgo(10), validTo: daysFromNow(90), projectIdsJson: [projects.SKY.id] } }));
  offers.push(await prisma.offer.create({ data: { companyId, name: "Registration charges waived", type: "AMOUNT_OFF", value: rupees(0), validFrom: daysAgo(400), validTo: daysAgo(200), active: false } }));
  return offers;
}

// ---------------------------------------------------------------------------
// Leads → funnel → bookings
// ---------------------------------------------------------------------------
async function seedLeadsAndPipeline(ctx) {
  const { companyId, users, projects, sources, campaigns, brokers, drivers, templates, offers } = ctx;
  const execs = [users.exec1, users.exec2, users.exec3, users.exec4];
  const activeBrokers = brokers.filter((b) => b.status === "ACTIVE");
  const sourceList = Object.values(sources);
  const campaignList = Object.values(campaigns);

  // Stage distribution for ~110 leads
  const stagePlan = [
    ...Array(28).fill("NEW"),
    ...Array(20).fill("CONTACTED"),
    ...Array(15).fill("QUALIFIED"),
    ...Array(9).fill("VISIT_SCHEDULED"),
    ...Array(10).fill("VISIT_DONE"),
    ...Array(6).fill("NEGOTIATION"),
    ...Array(4).fill("TOKEN"),
    ...Array(8).fill("BOOKED"),
    ...Array(8).fill("LOST"),
    ...Array(4).fill("UNQUALIFIED"),
  ];

  const stageScore = { NEW: 10, CONTACTED: 25, QUALIFIED: 45, VISIT_SCHEDULED: 55, VISIT_DONE: 65, NEGOTIATION: 78, TOKEN: 90, BOOKED: 100, LOST: 5, UNQUALIFIED: 0 };
  const lostReasons = ["BUDGET", "LOCATION", "BOUGHT_ELSEWHERE", "NOT_RESPONDING", "POSTPONED", "PRICE", "SIZE_UNAVAILABLE"];

  const availableUnits = {
    GV2: projects.GV2.units.filter((u) => u.status === "AVAILABLE"),
    SKY: projects.SKY.units.filter((u) => u.status === "AVAILABLE"),
  };
  const takeUnit = (key) => availableUnits[key].splice(Math.floor(rand() * availableUnits[key].length), 1)[0];

  const leads = [];
  let bookingSeq = 100;
  let tokenSeq = 40;
  let demandSeq = 400;
  let receiptSeq = 1000;
  let ticketSeq = 200;
  const bookings = [];

  for (const [i, stage] of stagePlan.entries()) {
    const projectKey = rand() < 0.62 ? "GV2" : "SKY";
    const project = projects[projectKey];
    const source = pick(sourceList);
    // Every other booked lead is broker-sourced so commissions / broker reports have data.
    const isBrokerLead = source.name === "Broker" || rand() < 0.15 || (stage === "BOOKED" && i % 2 === 0);
    const broker = isBrokerLead ? pick(activeBrokers) : null;
    const owner = stage === "NEW" && rand() < 0.3 ? null : pick(execs);
    const createdAt = stage === "NEW" ? daysAgo(between(0, 6), between(9, 18)) : daysAgo(between(7, 120), between(9, 18));
    const campaign = rand() < 0.5 ? campaignList.find((c) => c.sourceId === source.id) : null;
    const score = Math.min(100, Math.max(0, stageScore[stage] + between(-8, 8)));
    const temperature = score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD";
    const name = fullName();
    const phone = nextPhone();
    const city = pick(CITIES);
    const isPortal = ["99acres", "MagicBricks", "Housing.com", "IVR"].includes(source.name);
    const slaDueAt = new Date(createdAt.getTime() + (isPortal ? 5 : 30) * 60 * 1000);
    const contacted = !["NEW", "UNQUALIFIED"].includes(stage);
    const firstResponseAt = contacted ? new Date(createdAt.getTime() + between(2, 90) * 60 * 1000) : null;
    const slaBreached = Boolean(firstResponseAt && firstResponseAt > slaDueAt) || (stage === "NEW" && NOW > slaDueAt && i % 3 === 0);
    const isLost = stage === "LOST";
    const nextFollowUpAt = ["LOST", "UNQUALIFIED", "BOOKED"].includes(stage) ? null : stage === "NEW" ? null : daysFromNow(between(-3, 7), between(10, 18));

    const lead = await prisma.lead.create({
      data: {
        companyId, name, phone, email: rand() < 0.7 ? `${name.toLowerCase().replace(/\s+/g, ".")}${between(1, 99)}@gmail.com` : null,
        city, languagePreference: pick(["Hindi", "Hindi", "English", "Marwari"]),
        stage, temperature, score,
        scoreBreakdownJson: { source: source.scoreWeight, stage: stageScore[stage], engagement: score - stageScore[stage] - source.scoreWeight },
        ownerId: owner ? owner.id : null, projectId: project.id, sourceId: source.id, campaignId: campaign ? campaign.id : null,
        brokerId: broker ? broker.id : null, brokerTaggedAt: broker ? createdAt : null,
        protectionEndsAt: broker ? new Date(createdAt.getTime() + 60 * 86400000) : null,
        utmJson: campaign ? campaign.utmJson : null,
        firstTouchAt: createdAt, slaDueAt, firstResponseAt, slaBreached,
        lastActivityAt: contacted ? daysAgo(between(0, 10)) : createdAt,
        nextFollowUpAt, hasNoNextStep: !nextFollowUpAt && !["LOST", "UNQUALIFIED", "BOOKED", "NEW"].includes(stage),
        isStale: !isLost && stage !== "BOOKED" && stage !== "NEW" && rand() < 0.15,
        lostReason: isLost ? pick(lostReasons) : null,
        lostNote: isLost ? "Customer went quiet after cost sheet." : null,
        competitorName: isLost && rand() < 0.4 ? pick(["Manglam Group", "Ashiana Housing", "Mahima Group"]) : null,
        reEngageAfter: isLost ? daysFromNow(between(30, 120)) : null,
        consentText: "I agree to be contacted by EstateOS about my property enquiry.", consentAt: createdAt,
        marketingOptOut: rand() < 0.08, dnd: rand() < 0.04,
        createdById: users.presales.id, createdAt, updatedAt: createdAt,
      },
    });
    lead.projectKey = projectKey;
    leads.push(lead);

    // Requirement (most leads beyond NEW)
    if (stage !== "NEW" || rand() < 0.4) {
      const budgetMin = projectKey === "GV2" ? lakh(between(20, 45)) : lakh(between(55, 80));
      await prisma.leadRequirement.create({
        data: {
          companyId, leadId: lead.id, budgetMin, budgetMax: budgetMin + lakh(between(10, 30)),
          areaMin: projectKey === "GV2" ? pick([111, 150, 200]) : pick([1150, 1450]),
          areaMax: projectKey === "GV2" ? pick([200, 222, 300]) : pick([1450, 1650]),
          facingsJson: [pick(["EAST", "NORTH", "NORTH_EAST"])],
          attributesJson: rand() < 0.4 ? ["CORNER"] : rand() < 0.3 ? ["PARK_FACING"] : [],
          timeline: pick(TIMELINES), purpose: pick(PURPOSES),
          notes: pick(["Wants Vastu-compliant plot", "Prefers higher floor", "Needs home loan", "Comparing with another project", null]),
        },
      });
    }

    await prisma.activity.create({ data: { companyId, entityType: "LEAD", entityId: lead.id, type: "LEAD_CREATED", summary: `Lead created from ${source.name}`, actorType: "SYSTEM", createdAt } });

    // Notes & tasks for contacted leads
    if (contacted && owner) {
      await prisma.note.create({ data: { companyId, leadId: lead.id, authorId: owner.id, body: pick(["Spoke to customer, interested in corner plot on 60ft road.", "Customer wants to visit this weekend with family.", "Asked for cost sheet on WhatsApp.", "Budget is tight, may need 5% discount.", "Wants EMI estimate from HDFC."]), createdAt: daysAgo(between(1, 20)) } });
      await prisma.activity.create({ data: { companyId, entityType: "LEAD", entityId: lead.id, type: "CALL", summary: `Call by ${owner.name} — connected, interested`, actorType: "USER", actorId: owner.id, createdAt: firstResponseAt } });

      if (!["BOOKED", "LOST", "UNQUALIFIED"].includes(stage)) {
        const overdue = rand() < 0.3;
        await prisma.task.create({
          data: {
            companyId, leadId: lead.id, assigneeId: owner.id, type: pick(["CALL", "WHATSAPP", "CALL", "SITE_VISIT_PREP", "DOCUMENT"]),
            status: "OPEN", title: pick(["Follow-up call", "Send cost sheet", "Confirm site visit", "Share brochure & layout", "Loan document checklist"]),
            dueAt: overdue ? daysAgo(between(1, 5), 11) : daysFromNow(between(0, 5), between(10, 17)), reminderMinutesBefore: 30, createdById: owner.id,
          },
        });
      }
      if (rand() < 0.5) {
        await prisma.task.create({
          data: {
            companyId, leadId: lead.id, assigneeId: owner.id, type: "CALL", status: "DONE", title: "Introductory call",
            dueAt: daysAgo(between(5, 30), 12), completedAt: daysAgo(between(5, 30), 13), disposition: pick(["CONNECTED_INTERESTED", "CALLBACK_REQUESTED", "NOT_REACHABLE", "BUSY"]), createdById: owner.id,
          },
        });
      }
    }

    // Shortlist a couple of units
    if (["QUALIFIED", "VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION"].includes(stage)) {
      const pool = availableUnits[projectKey];
      for (const u of [pick(pool), pick(pool)]) {
        await prisma.leadShortlist.create({ data: { companyId, leadId: lead.id, unitId: u.id } }).catch(() => {});
      }
    }

    // Site visits
    const visitStages = ["VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION", "TOKEN", "BOOKED"];
    if (visitStages.includes(stage) && owner) {
      const scheduled = stage === "VISIT_SCHEDULED";
      const scheduledAt = scheduled ? (i % 2 === 0 ? todayAt(between(11, 17)) : daysFromNow(between(1, 6), between(10, 17))) : daysAgo(between(3, 40), between(10, 17));
      const pickup = rand() < 0.4;
      const visit = await prisma.siteVisit.create({
        data: {
          companyId, leadId: lead.id, projectId: project.id, execId: owner.id, scheduledAt, slotMinutes: 45,
          type: projectKey === "SKY" && rand() < 0.5 ? "SAMPLE_FLAT" : "SITE",
          status: scheduled ? (rand() < 0.5 ? "CONFIRMED" : "SCHEDULED") : "VISITED",
          pickupRequired: pickup, pickupAddress: pickup ? `${pick(["Malviya Nagar", "Mansarovar", "Vaishali Nagar", "Tonk Road"])}, Jaipur` : null,
          pickupAt: pickup ? new Date(scheduledAt.getTime() - 60 * 60000) : null, driverId: pickup ? drivers[0].id : null,
          attendeesCount: between(1, 4), brokerId: broker ? broker.id : null,
          confirmedAt: scheduled && rand() < 0.5 ? daysAgo(1) : !scheduled ? new Date(scheduledAt.getTime() - 86400000) : null,
          checkedInAt: scheduled ? null : new Date(scheduledAt.getTime() + 10 * 60000),
          checkInLat: scheduled ? null : project.latitude + 0.0004, checkInLng: scheduled ? null : project.longitude - 0.0003,
          unitsToShowJson: [pick(availableUnits[projectKey]).unitCode, pick(availableUnits[projectKey]).unitCode],
          createdById: owner.id,
        },
      });
      if (!scheduled) {
        await prisma.siteVisitOutcome.create({
          data: {
            companyId, siteVisitId: visit.id,
            result: stage === "VISIT_DONE" ? pick(["INTERESTED", "NEEDS_TIME", "INTERESTED"]) : "VERY_INTERESTED",
            budgetFit: pick(["YES", "YES", "STRETCH"]), objectionsJson: pick([["PRICE"], ["LOCATION"], [], ["LOAN"], ["PRICE", "SIZE"]]),
            nextStep: pick(["Share cost sheet", "Second visit with spouse", "Negotiate on discount", "Collect token"]),
            nextFollowUpAt: daysFromNow(between(1, 5)), notes: "Liked the corner plot, asked about payment plan.", submittedById: owner.id,
          },
        });
        await prisma.activity.create({ data: { companyId, entityType: "LEAD", entityId: lead.id, type: "SITE_VISIT_DONE", summary: `Site visit completed at ${project.name}`, actorType: "USER", actorId: owner.id, createdAt: scheduledAt } });
      }
    }
    // A few no-shows / cancellations on lost leads
    if (isLost && rand() < 0.5 && owner) {
      await prisma.siteVisit.create({
        data: { companyId, leadId: lead.id, projectId: project.id, execId: owner.id, scheduledAt: daysAgo(between(10, 40), 15), status: pick(["NO_SHOW", "CANCELLED"]), cancelReason: "Customer did not turn up", cancelledAt: daysAgo(between(10, 40), 17), createdById: owner.id },
      });
    }

    // Cost sheets for negotiation / token / booked
    let costSheet = null;
    let unit = null;
    const gender = rand() < 0.3 ? "FEMALE" : "MALE";
    if (["NEGOTIATION", "TOKEN", "BOOKED"].includes(stage) && owner) {
      unit = takeUnit(projectKey);
      const discountPct = stage === "NEGOTIATION" ? pick([0, 2, 3]) : pick([0, 1, 2]);
      const cs = computeCostSheet(project, unit, gender, discountPct);
      costSheet = await prisma.costSheet.create({
        data: {
          companyId, projectId: project.id, leadId: lead.id, unitId: unit.id, rateCardId: project.rateCard.id,
          version: 1, applicantName: name, ...cs,
          paymentPlanTemplateId: (projectKey === "GV2" ? templates.plots : templates.apartments).id,
          loanAssumed: rand() < 0.5, loanPct: 75, emiEstimate: (cs.agreementValue * 75n) / 100n / 180n,
          validUntil: daysFromNow(15), isIndicative: stage === "NEGOTIATION" && discountPct > 2,
          shareToken: `cs_${lead.id.slice(-8)}_${i}`, viewCount: between(0, 6), firstViewedAt: rand() < 0.7 ? daysAgo(between(1, 10)) : null,
          preparedById: owner.id, offerIds: rand() < 0.4 ? [offers[projectKey === "GV2" ? 0 : 1].id] : [],
        },
      });
      await prisma.activity.create({ data: { companyId, entityType: "LEAD", entityId: lead.id, type: "COST_SHEET_SHARED", summary: `Cost sheet shared for ${unit.unitCode} — ${inr(cs.totalCost)}`, actorType: "USER", actorId: owner.id } });

      if (stage === "NEGOTIATION") {
        await prisma.negotiation.create({ data: { companyId, costSheetId: costSheet.id, customerAsked: cs.agreementValue - pct(cs.agreementValue, 5), weOffered: cs.agreementValue - pct(cs.agreementValue, 2), notes: "Customer asking 5%, offered 2%.", loggedById: owner.id } });
        if (discountPct >= 3) {
          await prisma.approvalRequest.create({
            data: {
              companyId, type: "DISCOUNT", status: "PENDING", entityType: "COST_SHEET", entityId: costSheet.id,
              requestedAmount: cs.discountAmount, requestedPct: discountPct, justification: "Customer is comparing with Manglam; closing this week if approved.",
              contextJson: { unit: unit.unitCode, agreementValue: cs.agreementValue.toString(), currency: CURRENCY, execAvgDiscount30d: 1.8 },
              requestedById: owner.id, approverId: users.salesHead.id, slaDueAt: daysFromNow(0, 18),
            },
          });
        }
        // Hold the unit
        await prisma.hold.create({ data: { companyId, projectId: project.id, unitId: unit.id, leadId: lead.id, heldById: owner.id, status: "ACTIVE", reason: "Negotiation in progress", expiresAt: daysFromNow(between(1, 2), 18) } });
        await prisma.unit.update({ where: { id: unit.id }, data: { status: "ON_HOLD", version: { increment: 1 } } });
        await prisma.unitStatusHistory.create({ data: { companyId, unitId: unit.id, fromStatus: "AVAILABLE", toStatus: "ON_HOLD", reason: "Hold for negotiation", changedById: owner.id, leadId: lead.id } });
      }
    }

    // Token
    let token = null;
    if (["TOKEN", "BOOKED"].includes(stage) && costSheet) {
      const receivedOn = stage === "TOKEN" ? daysAgo(between(1, 5)) : daysAgo(between(20, 90));
      const mode = pick(["UPI", "NEFT_RTGS", "CHEQUE", "ONLINE_LINK"]);
      tokenSeq += 1;
      token = await prisma.token.create({
        data: {
          companyId, projectId: project.id, leadId: lead.id, unitId: unit.id,
          receiptNumber: `TK/${project.shortCode}/${String(tokenSeq).padStart(4, "0")}`,
          amount: projectKey === "GV2" ? lakh(1) : lakh(2), mode,
          transactionRef: mode === "UPI" ? `UPI${between(100000000, 999999999)}` : mode === "NEFT_RTGS" ? `N${between(100000000, 999999999)}` : null,
          chequeNumber: mode === "CHEQUE" ? String(between(100000, 999999)) : null, bankName: mode === "CHEQUE" || mode === "NEFT_RTGS" ? pick(["SBI", "HDFC Bank", "ICICI Bank", "Bank of Baroda"]) : null,
          receivedOn, agreedPrice: costSheet.agreementValue, validUntil: new Date(receivedOn.getTime() + 7 * 86400000),
          status: stage === "TOKEN" ? "RECEIVED" : "CONVERTED", receivedById: owner.id,
        },
      });
      if (stage === "TOKEN") {
        await prisma.unit.update({ where: { id: unit.id }, data: { status: "BLOCKED", lockedPriceJson: costSheet.breakupJson, lockedRateCardId: project.rateCard.id, lockedAt: receivedOn, version: { increment: 1 } } });
        await prisma.unitStatusHistory.create({ data: { companyId, unitId: unit.id, fromStatus: "AVAILABLE", toStatus: "BLOCKED", reason: `Token ${token.receiptNumber} received`, changedById: owner.id, leadId: lead.id, createdAt: receivedOn } });
        await prisma.activity.create({ data: { companyId, entityType: "LEAD", entityId: lead.id, type: "TOKEN_RECEIVED", summary: `Token ${inr(token.amount)} received via ${mode}`, actorType: "USER", actorId: owner.id, createdAt: receivedOn } });
      }
    }

    // Booking
    if (stage === "BOOKED" && token) {
      const bookedOn = new Date(token.receivedOn.getTime() + between(2, 6) * 86400000);
      const ageDays = Math.floor((NOW - bookedOn) / 86400000);
      const bookingStatus = ageDays > 75 ? pick(["AGREEMENT", "REGISTERED"]) : ageDays > 40 ? pick(["BOOKED", "AGREEMENT"]) : "BOOKED";
      const unitStatus = bookingStatus === "REGISTERED" ? "REGISTERED" : bookingStatus === "AGREEMENT" ? "AGREEMENT" : "BOOKED";
      bookingSeq += 1;
      const customer = await prisma.customer.create({
        data: { companyId, name, phone, email: lead.email, panLast4: String(between(1000, 9999)), panEncrypted: `enc:${between(100000, 999999)}`, addressJson: { line1: `${between(1, 400)}, ${pick(["Malviya Nagar", "Mansarovar", "Vaishali Nagar", "Jagatpura"])}`, city, state: "Rajasthan", pincode: "3020" + between(10, 39) }, portalAccessEnabled: true, relationshipManagerId: users.crm.id, createdAt: bookedOn },
      });
      await prisma.lead.update({ where: { id: lead.id }, data: { customerId: customer.id } });

      const brokeragePct = broker ? (broker.tier === "GOLD" ? 2.5 : 2) : null;
      const funding = rand() < 0.55 ? "HOME_LOAN" : "SELF";
      const loanAmount = funding === "HOME_LOAN" ? (costSheet.agreementValue * 75n) / 100n : null;
      const booking = await prisma.booking.create({
        data: {
          companyId, projectId: project.id, unitId: unit.id, leadId: lead.id, tokenId: token.id, customerId: customer.id,
          bookingNumber: `BK/${project.shortCode}/${String(bookingSeq).padStart(4, "0")}`, status: bookingStatus, bookedOn,
          agreementValue: costSheet.agreementValue, discountAmount: costSheet.discountAmount, lockedPriceJson: costSheet.breakupJson,
          brokerId: broker ? broker.id : null, brokeragePct, brokerageAmount: broker ? pct(costSheet.agreementValue, brokeragePct) : null,
          fundingType: funding, bankName: funding === "HOME_LOAN" ? pick(["HDFC Bank", "SBI", "ICICI Bank", "LIC HFL"]) : null, loanAmount,
          loanStatus: funding === "HOME_LOAN" ? pick(["APPLIED", "SANCTIONED", "SANCTIONED", "DISBURSED"]) : "NOT_APPLIED",
          nomineeName: fullName(), nomineeRelation: pick(["Spouse", "Son", "Daughter", "Father"]),
          eSignMethod: pick(["AADHAAR_ESIGN", "OTP_CONSENT", "PHYSICAL_UPLOAD"]), declarationsAccepted: true,
          agreementSignedOn: ["AGREEMENT", "REGISTERED"].includes(bookingStatus) ? new Date(bookedOn.getTime() + 30 * 86400000) : null,
          registeredOn: bookingStatus === "REGISTERED" ? new Date(bookedOn.getTime() + 70 * 86400000) : null,
          registrationNumber: bookingStatus === "REGISTERED" ? `2026/${between(1000, 9999)}` : null,
          sroOffice: bookingStatus === "REGISTERED" ? "SRO Jaipur-IV" : null,
          salesExecId: owner.id, approvedById: users.salesHead.id, approvedAt: bookedOn, createdById: owner.id, createdAt: bookedOn,
          offerIds: costSheet.offerIds,
        },
      });
      bookings.push(booking);

      await prisma.unit.update({ where: { id: unit.id }, data: { status: unitStatus, lockedPriceJson: costSheet.breakupJson, lockedRateCardId: project.rateCard.id, lockedAt: token.receivedOn, version: { increment: 2 } } });
      await prisma.unitStatusHistory.create({ data: { companyId, unitId: unit.id, fromStatus: "AVAILABLE", toStatus: "BLOCKED", reason: `Token ${token.receiptNumber}`, changedById: owner.id, leadId: lead.id, createdAt: token.receivedOn } });
      await prisma.unitStatusHistory.create({ data: { companyId, unitId: unit.id, fromStatus: "BLOCKED", toStatus: "BOOKED", reason: `Booking ${booking.bookingNumber} approved`, changedById: users.salesHead.id, leadId: lead.id, bookingId: booking.id, createdAt: bookedOn } });
      if (unitStatus !== "BOOKED") {
        await prisma.unitStatusHistory.create({ data: { companyId, unitId: unit.id, fromStatus: "BOOKED", toStatus: "AGREEMENT", reason: "Agreement signed", changedById: users.crm.id, bookingId: booking.id, createdAt: booking.agreementSignedOn } });
      }
      if (unitStatus === "REGISTERED") {
        await prisma.unitStatusHistory.create({ data: { companyId, unitId: unit.id, fromStatus: "AGREEMENT", toStatus: "REGISTERED", reason: "Registry done", changedById: users.crm.id, bookingId: booking.id, createdAt: booking.registeredOn } });
      }
      await prisma.approvalRequest.create({ data: { companyId, type: "BOOKING", status: "APPROVED", entityType: "BOOKING", entityId: booking.id, requestedAmount: costSheet.agreementValue, requestedById: owner.id, approverId: users.salesHead.id, decidedAt: bookedOn, decisionNote: "Approved", createdAt: bookedOn } });
      await prisma.activity.create({ data: { companyId, entityType: "BOOKING", entityId: booking.id, type: "BOOKING_APPROVED", summary: `Booking ${booking.bookingNumber} approved — ${inr(costSheet.agreementValue)}`, actorType: "USER", actorId: users.salesHead.id, createdAt: bookedOn } });

      // Applicants
      await prisma.applicant.create({
        data: {
          companyId, bookingId: booking.id, isPrimary: true, name, phone, email: lead.email, gender, maritalStatus: pick(["MARRIED", "MARRIED", "SINGLE"]),
          dob: new Date(1970 + between(5, 30), between(0, 11), between(1, 28)), fatherOrHusbandName: fullName(), occupation: pick(["Business", "Service", "Govt. employee", "Doctor", "Engineer"]),
          employer: pick(["Self-employed", "Infosys", "Rajasthan Govt.", "Tata Motors", "Own clinic"]),
          panLast4: customer.panLast4, panEncrypted: customer.panEncrypted, aadhaarLast4: String(between(1000, 9999)), aadhaarEncrypted: `enc:${between(100000, 999999)}`,
          currentAddress: `${customer.addressJson.line1}, ${city}`, kycVerified: bookingStatus !== "BOOKED", kycVerifiedBy: bookingStatus !== "BOOKED" ? users.crm.id : null, kycVerifiedAt: bookingStatus !== "BOOKED" ? booking.agreementSignedOn : null,
          documents: { create: [
            { companyId, type: "PAN", fileKey: `kyc/${booking.id}/pan.pdf`, fileName: "pan.pdf", sizeBytes: 182334, virusScanned: true, verified: bookingStatus !== "BOOKED" },
            { companyId, type: "AADHAAR_FRONT", fileKey: `kyc/${booking.id}/aadhaar-front.jpg`, fileName: "aadhaar-front.jpg", sizeBytes: 402113, virusScanned: true, verified: bookingStatus !== "BOOKED" },
            { companyId, type: "PHOTO", fileKey: `kyc/${booking.id}/photo.jpg`, fileName: "photo.jpg", sizeBytes: 88210, virusScanned: true },
          ] },
        },
      });
      if (rand() < 0.4) {
        await prisma.applicant.create({ data: { companyId, bookingId: booking.id, isPrimary: false, relationship: "Spouse", name: fullName(), phone: nextPhone(), gender: gender === "MALE" ? "FEMALE" : "MALE", maritalStatus: "MARRIED", nationality: "Indian" } });
      }

      // Payment plan, demands, receipts, ledger
      const template = projectKey === "GV2" ? templates.plots : templates.apartments;
      await prisma.paymentPlan.create({ data: { companyId, bookingId: booking.id, templateId: template.id, type: template.type, rowsJson: template.rowsJson } });

      const rows = template.rowsJson;
      let balance = 0n;
      const ledgerRows = [];
      const demands = [];
      for (const [ri, row] of rows.entries()) {
        let dueDate;
        let milestone = null;
        if (row.dueRule === "ON_MILESTONE") {
          milestone = project.milestoneRows.find((m) => m.name === row.milestone);
          if (milestone.status !== "COMPLETED") continue; // not yet raised
          dueDate = new Date(Math.max(milestone.actualDate.getTime(), bookedOn.getTime()) + 15 * 86400000);
        } else {
          dueDate = new Date(bookedOn.getTime() + row.daysAfterBooking * 86400000);
        }
        if (dueDate > daysFromNow(60)) continue; // future demands not raised yet
        const amount = pct(costSheet.agreementValue, row.pctOfValue);
        const overdueDays = Math.floor((NOW - dueDate) / 86400000) - (row.graceDays || 0);
        let status = "UPCOMING";
        if (dueDate <= NOW) status = overdueDays > 0 ? "OVERDUE" : "DUE";
        demandSeq += 1;
        const demand = await prisma.demand.create({
          data: {
            companyId, bookingId: booking.id, milestoneId: milestone ? milestone.id : null,
            demandNumber: `DM/${project.shortCode}/${String(demandSeq).padStart(4, "0")}`, sequenceNo: ri + 1, label: row.label, pctOfValue: row.pctOfValue,
            amount, dueDate, graceDays: row.graceDays || 0, interestPctPa: row.interestPctPa || null, status,
            interestAccrued: status === "OVERDUE" && row.interestPctPa ? (amount * BigInt(row.interestPctPa) * BigInt(overdueDays)) / 36500n / 100n : 0n,
            remindersSent: status === "OVERDUE" ? between(1, 3) : 0, lastReminderAt: status === "OVERDUE" ? daysAgo(between(1, 7)) : null,
            createdAt: new Date(Math.min(dueDate.getTime() - 15 * 86400000, NOW.getTime())),
          },
        });
        demands.push(demand);
        balance += amount;
        ledgerRows.push({ entryDate: demand.createdAt, particulars: `Demand ${demand.demandNumber} — ${row.label}`, type: "DEBIT", amount, balance, sourceType: "DEMAND", sourceId: demand.id });
      }

      // Token counts towards the booking amount
      const tokenReceipt = await prisma.receipt.create({
        data: { companyId, bookingId: booking.id, receiptNumber: `RC/${project.shortCode}/${String(++receiptSeq).padStart(4, "0")}`, amount: token.amount, mode: token.mode, status: "CLEARED", transactionRef: token.transactionRef, chequeNumber: token.chequeNumber, bankName: token.bankName, receivedOn: token.receivedOn, clearedOn: token.receivedOn, remarks: `Token ${token.receiptNumber} adjusted`, receivedById: owner.id, createdAt: token.receivedOn },
      });
      const receipts = [tokenReceipt];
      // Pay past demands (fully or partially)
      for (const demand of demands) {
        if (demand.status === "UPCOMING") continue;
        const willPay = rand();
        if (willPay < 0.25) continue; // leave overdue
        const partial = willPay < 0.45;
        const payAmount = partial ? (demand.amount * BigInt(between(30, 70))) / 100n : demand.amount;
        const mode = pick(["NEFT_RTGS", "UPI", "CHEQUE", "ONLINE_LINK", "NEFT_RTGS"]);
        const receivedOn = new Date(Math.min(demand.dueDate.getTime() + between(-5, 10) * 86400000, NOW.getTime()));
        const rstatus = mode === "CHEQUE" ? pick(["CLEARED", "CLEARED", "PENDING_CLEARANCE", "BOUNCED"]) : "CLEARED";
        receipts.push(
          await prisma.receipt.create({
            data: {
              companyId, bookingId: booking.id, receiptNumber: `RC/${project.shortCode}/${String(++receiptSeq).padStart(4, "0")}`, amount: payAmount, mode, status: rstatus,
              transactionRef: mode !== "CHEQUE" ? `${mode === "UPI" ? "UPI" : "TXN"}${between(100000000, 999999999)}` : null,
              chequeNumber: mode === "CHEQUE" ? String(between(100000, 999999)) : null, bankName: mode === "CHEQUE" || mode === "NEFT_RTGS" ? pick(["SBI", "HDFC Bank", "ICICI Bank", "Punjab National Bank"]) : null,
              instrumentDate: mode === "CHEQUE" ? receivedOn : null, receivedOn, depositedOn: mode === "CHEQUE" ? new Date(receivedOn.getTime() + 86400000) : null,
              clearedOn: rstatus === "CLEARED" ? new Date(receivedOn.getTime() + (mode === "CHEQUE" ? 3 : 0) * 86400000) : null,
              bouncedOn: rstatus === "BOUNCED" ? new Date(receivedOn.getTime() + 3 * 86400000) : null, bounceCharge: rstatus === "BOUNCED" ? rupees(500) : null, bounceReason: rstatus === "BOUNCED" ? "Insufficient funds" : null,
              receivedById: users.accounts.id, createdAt: receivedOn,
            },
          })
        );
      }
      // Allocate cleared receipts oldest-demand-first
      const paid = new Map(demands.map((d) => [d.id, 0n]));
      for (const receipt of receipts.filter((r) => r.status === "CLEARED" || r.status === "PENDING_CLEARANCE")) {
        let remaining = receipt.amount;
        for (const demand of demands) {
          const open = demand.amount - paid.get(demand.id);
          if (open <= 0n || remaining <= 0n) continue;
          const alloc = remaining < open ? remaining : open;
          await prisma.receiptAllocation.create({ data: { companyId, receiptId: receipt.id, demandId: demand.id, amount: alloc, createdAt: receipt.receivedOn } });
          paid.set(demand.id, paid.get(demand.id) + alloc);
          remaining -= alloc;
        }
        if (remaining > 0n) await prisma.receipt.update({ where: { id: receipt.id }, data: { unallocatedAmount: remaining } });
        balance -= receipt.amount;
        ledgerRows.push({ entryDate: receipt.receivedOn, particulars: `Receipt ${receipt.receiptNumber} (${receipt.mode})`, type: "CREDIT", amount: receipt.amount, balance, sourceType: "RECEIPT", sourceId: receipt.id });
      }
      for (const receipt of receipts.filter((r) => r.status === "BOUNCED")) {
        balance += receipt.bounceCharge;
        ledgerRows.push({ entryDate: receipt.bouncedOn, particulars: `Cheque bounce charge — ${receipt.receiptNumber}`, type: "DEBIT", amount: receipt.bounceCharge, balance, sourceType: "BOUNCE_CHARGE", sourceId: receipt.id });
      }
      for (const demand of demands) {
        const p = paid.get(demand.id);
        const status = p >= demand.amount ? "PAID" : p > 0n ? "PARTIAL" : demand.status;
        await prisma.demand.update({ where: { id: demand.id }, data: { paidAmount: p, status } });
      }
      ledgerRows.sort((a, b) => a.entryDate - b.entryDate);
      let running = 0n;
      for (const row of ledgerRows) {
        running += row.type === "DEBIT" ? row.amount : -row.amount;
        await prisma.ledger.create({ data: { companyId, bookingId: booking.id, ...row, balance: running } });
      }

      // Commission
      if (broker) {
        const amount = booking.brokerageAmount;
        const cstatus = bookingStatus === "REGISTERED" ? "PAID" : bookingStatus === "AGREEMENT" ? pick(["APPROVED", "INVOICED"]) : "ACCRUED";
        await prisma.commission.create({
          data: {
            companyId, brokerId: broker.id, bookingId: booking.id, agreementValue: costSheet.agreementValue, brokeragePct, amount, status: cstatus, payableTrigger: "On 30% collection",
            invoiceNumber: cstatus !== "ACCRUED" ? `INV/${broker.contactPerson.split(" ")[0].toUpperCase()}/${between(10, 99)}` : null,
            approvedById: ["APPROVED", "PAID"].includes(cstatus) ? users.director.id : null, approvedAt: ["APPROVED", "PAID"].includes(cstatus) ? daysAgo(between(5, 30)) : null,
            paidOn: cstatus === "PAID" ? daysAgo(between(1, 10)) : null, utr: cstatus === "PAID" ? `UTR${between(100000000, 999999999)}` : null, tdsAmount: cstatus === "PAID" ? pct(amount, 5) : null,
          },
        });
        if (cstatus === "APPROVED") {
          await prisma.approvalRequest.create({ data: { companyId, type: "BROKER_PAYOUT", status: "APPROVED", entityType: "COMMISSION", entityId: booking.id, requestedAmount: amount, requestedById: users.accounts.id, approverId: users.director.id, decidedAt: daysAgo(between(5, 30)), decisionNote: "Payout approved" } });
        }
      }

      // Tickets for some customers
      if (rand() < 0.5) {
        ticketSeq += 1;
        const category = pick(["PAYMENT", "DOCUMENT", "CONSTRUCTION", "REGISTRATION"]);
        const tstatus = pick(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]);
        await prisma.ticket.create({
          data: {
            companyId, customerId: customer.id, bookingId: booking.id, ticketNumber: `TKT/${String(ticketSeq).padStart(4, "0")}`, category,
            priority: pick(["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"]), status: tstatus,
            subject: { PAYMENT: "Receipt not received for NEFT payment", DOCUMENT: "Need copy of allotment letter", CONSTRUCTION: "When will roads be completed?", REGISTRATION: "Registry date request" }[category],
            body: "Raised via customer portal.", assigneeId: users.crm.id, slaDueAt: daysFromNow(2), resolvedAt: ["RESOLVED", "CLOSED"].includes(tstatus) ? daysAgo(between(1, 5)) : null, createdAt: daysAgo(between(1, 20)),
          },
        });
      }

      // Booking-level task / note
      await prisma.task.create({ data: { companyId, bookingId: booking.id, assigneeId: users.crm.id, type: "DOCUMENT", status: bookingStatus === "BOOKED" ? "OPEN" : "DONE", title: "Collect signed agreement", dueAt: new Date(bookedOn.getTime() + 30 * 86400000), completedAt: bookingStatus === "BOOKED" ? null : booking.agreementSignedOn, createdById: users.crm.id } });
      await prisma.note.create({ data: { companyId, bookingId: booking.id, leadId: lead.id, authorId: users.crm.id, body: "Welcome call done. Customer briefed on payment schedule.", createdAt: new Date(bookedOn.getTime() + 86400000) } });
    }
  }

  // One cancelled booking for the cancellation / refund flow
  {
    const project = projects.GV2;
    const unit = takeUnit("GV2");
    const owner = users.exec2;
    const name = fullName();
    const phone = nextPhone();
    const bookedOn = daysAgo(120);
    const lead = await prisma.lead.create({ data: { companyId, name, phone, city: "Jaipur", stage: "LOST", temperature: "COLD", score: 5, lostReason: "POSTPONED", lostNote: "Booking cancelled — family emergency", ownerId: owner.id, projectId: project.id, sourceId: sources["Walk-in"].id, firstTouchAt: daysAgo(140), createdAt: daysAgo(140), createdById: users.presales.id } });
    const cs = computeCostSheet(project, unit, "MALE", 0);
    const costSheet = await prisma.costSheet.create({ data: { companyId, projectId: project.id, leadId: lead.id, unitId: unit.id, rateCardId: project.rateCard.id, applicantName: name, ...cs, shareToken: `cs_cancelled_${lead.id.slice(-8)}`, preparedById: owner.id, createdAt: daysAgo(130) } });
    const token = await prisma.token.create({ data: { companyId, projectId: project.id, leadId: lead.id, unitId: unit.id, receiptNumber: `TK/${project.shortCode}/${String(++tokenSeq).padStart(4, "0")}`, amount: lakh(1), mode: "UPI", transactionRef: "UPI556677889", receivedOn: daysAgo(125), agreedPrice: cs.agreementValue, validUntil: daysAgo(118), status: "CONVERTED", receivedById: owner.id, createdAt: daysAgo(125) } });
    const customer = await prisma.customer.create({ data: { companyId, name, phone, panLast4: "7781", panEncrypted: "enc:cancelled", createdAt: bookedOn } });
    const booking = await prisma.booking.create({
      data: {
        companyId, projectId: project.id, unitId: unit.id, leadId: lead.id, tokenId: token.id, customerId: customer.id,
        bookingNumber: `BK/${project.shortCode}/${String(++bookingSeq).padStart(4, "0")}`, status: "CANCELLED", bookedOn,
        agreementValue: cs.agreementValue, lockedPriceJson: cs.breakupJson, fundingType: "SELF", salesExecId: owner.id, approvedById: users.salesHead.id, approvedAt: bookedOn,
        cancelledOn: daysAgo(30), cancelReason: "Customer withdrew due to family emergency", cancelRequestedBy: customer.id,
        cancellationCharges: pct(cs.agreementValue, 2), refundAmount: lakh(1) + pct(cs.agreementValue, 10) - pct(cs.agreementValue, 2), createdById: owner.id, createdAt: bookedOn,
      },
    });
    bookings.push(booking);
    await prisma.paymentPlan.create({ data: { companyId, bookingId: booking.id, templateId: templates.plots.id, type: "TIME_LINKED", rowsJson: templates.plots.rowsJson } });
    const d1 = await prisma.demand.create({ data: { companyId, bookingId: booking.id, demandNumber: `DM/${project.shortCode}/${String(++demandSeq).padStart(4, "0")}`, sequenceNo: 1, label: "Booking amount", pctOfValue: 10, amount: pct(cs.agreementValue, 10), dueDate: bookedOn, status: "PAID", paidAmount: pct(cs.agreementValue, 10), createdAt: bookedOn } });
    const r1 = await prisma.receipt.create({ data: { companyId, bookingId: booking.id, receiptNumber: `RC/${project.shortCode}/${String(++receiptSeq).padStart(4, "0")}`, amount: pct(cs.agreementValue, 10), mode: "NEFT_RTGS", status: "CLEARED", transactionRef: "N778899001", bankName: "SBI", receivedOn: bookedOn, clearedOn: bookedOn, receivedById: users.accounts.id, createdAt: bookedOn } });
    await prisma.receiptAllocation.create({ data: { companyId, receiptId: r1.id, demandId: d1.id, amount: r1.amount } });
    await prisma.demand.create({ data: { companyId, bookingId: booking.id, demandNumber: `DM/${project.shortCode}/${String(++demandSeq).padStart(4, "0")}`, sequenceNo: 2, label: "Within 30 days of booking", pctOfValue: 20, amount: pct(cs.agreementValue, 20), dueDate: daysAgo(90), status: "WAIVED", waivedReason: "Booking cancelled", createdAt: daysAgo(105) } });
    await prisma.ledger.createMany({ data: [
      { companyId, bookingId: booking.id, entryDate: bookedOn, particulars: `Demand ${d1.demandNumber} — Booking amount`, type: "DEBIT", amount: d1.amount, balance: d1.amount, sourceType: "DEMAND", sourceId: d1.id },
      { companyId, bookingId: booking.id, entryDate: bookedOn, particulars: `Receipt ${r1.receiptNumber} (NEFT_RTGS)`, type: "CREDIT", amount: r1.amount, balance: 0n, sourceType: "RECEIPT", sourceId: r1.id },
      { companyId, bookingId: booking.id, entryDate: daysAgo(30), particulars: "Cancellation charges 2%", type: "DEBIT", amount: booking.cancellationCharges, balance: booking.cancellationCharges, sourceType: "ADJUSTMENT" },
    ] });
    await prisma.refund.create({ data: { companyId, bookingId: booking.id, amount: booking.refundAmount, tdsAmount: 0n, status: "APPROVED", mode: "NEFT_RTGS", expectedDate: daysFromNow(10), reason: "Booking cancellation", requestedById: users.crm.id, approvedById: users.director.id, approvedAt: daysAgo(20), createdAt: daysAgo(28) } });
    await prisma.approvalRequest.create({ data: { companyId, type: "CANCELLATION", status: "APPROVED", entityType: "BOOKING", entityId: booking.id, requestedAmount: booking.refundAmount, justification: "Customer request, family emergency", requestedById: users.crm.id, approverId: users.director.id, decidedAt: daysAgo(25), decisionNote: "Approved with 2% deduction", createdAt: daysAgo(30) } });
    await prisma.approvalRequest.create({ data: { companyId, type: "REFUND", status: "PENDING", entityType: "REFUND", entityId: booking.id, requestedAmount: booking.refundAmount, justification: "Refund after cancellation approval", requestedById: users.accounts.id, approverId: users.director.id, slaDueAt: daysFromNow(1, 14), createdAt: daysAgo(2) } });
    await prisma.unit.update({ where: { id: unit.id }, data: { status: "AVAILABLE", isReReleased: true, availableSince: daysAgo(30), lockedPriceJson: null, lockedRateCardId: null, lockedAt: null, version: { increment: 3 } } });
    await prisma.unitStatusHistory.createMany({ data: [
      { companyId, unitId: unit.id, fromStatus: "AVAILABLE", toStatus: "BLOCKED", reason: `Token ${token.receiptNumber}`, changedById: owner.id, leadId: lead.id, createdAt: daysAgo(125) },
      { companyId, unitId: unit.id, fromStatus: "BLOCKED", toStatus: "BOOKED", reason: `Booking ${booking.bookingNumber} approved`, changedById: users.salesHead.id, bookingId: booking.id, createdAt: bookedOn },
      { companyId, unitId: unit.id, fromStatus: "BOOKED", toStatus: "AVAILABLE", reason: "Booking cancelled — re-released", changedById: users.director.id, bookingId: booking.id, createdAt: daysAgo(30) },
    ] });
    await prisma.ticket.create({ data: { companyId, customerId: customer.id, bookingId: booking.id, ticketNumber: `TKT/${String(++ticketSeq).padStart(4, "0")}`, category: "PAYMENT", priority: "HIGH", status: "IN_PROGRESS", subject: "Refund status after cancellation", body: "Please share the expected refund date.", assigneeId: users.accounts.id, slaDueAt: daysFromNow(1), createdAt: daysAgo(3) } });
  }

  // Extra pending approvals so the dashboard shows a queue
  const holdLead = leads.find((l) => l.stage === "NEGOTIATION");
  if (holdLead) {
    const hold = await prisma.hold.findFirst({ where: { companyId, leadId: holdLead.id } });
    if (hold) {
      await prisma.approvalRequest.create({ data: { companyId, type: "HOLD_EXTENSION", status: "PENDING", entityType: "HOLD", entityId: hold.id, justification: "Customer travelling, back on Monday with token.", requestedById: hold.heldById, approverId: users.tlA.id, slaDueAt: daysFromNow(0, 17) } });
    }
  }
  await prisma.approvalRequest.create({ data: { companyId, type: "RATE_CARD_PUBLISH", status: "PENDING", entityType: "RATE_CARD", entityId: projects.RVL.rateCard.id, justification: "Royal Villas launch rate card v2", contextJson: { baseRate: projects.RVL.baseRate.toString(), currency: CURRENCY }, requestedById: users.inventory.id, approverId: users.director.id, slaDueAt: daysFromNow(1, 12) } });

  // Lead dispute between two brokers
  const brokerLead = leads.find((l) => l.brokerId);
  if (brokerLead) {
    const otherBroker = activeBrokers.find((b) => b.id !== brokerLead.brokerId);
    await prisma.leadDispute.create({ data: { companyId, leadId: brokerLead.id, brokerAId: brokerLead.brokerId, brokerBId: otherBroker.id, status: "OPEN", createdAt: daysAgo(2) } });
  }

  return { leads, bookings };
}

async function seedNotifications(companyId, users) {
  const items = [
    { user: users.exec1, event: "LEAD_ASSIGNED", title: "New lead assigned", body: "Portal lead from 99acres — respond within 5 min", linkPath: "/leads", priority: "HIGH" },
    { user: users.exec1, event: "TASK_OVERDUE", title: "3 follow-ups overdue", body: "Open your task list", linkPath: "/tasks", priority: "MEDIUM" },
    { user: users.salesHead, event: "APPROVAL_PENDING", title: "Discount approval pending", body: "3% discount requested on GV2 cost sheet", linkPath: "/approvals", priority: "HIGH" },
    { user: users.accounts, event: "CHEQUE_BOUNCED", title: "Cheque bounced", body: "A receipt bounced — bounce charge applied", linkPath: "/receipts", priority: "URGENT" },
    { user: users.director, event: "REFUND_APPROVAL", title: "Refund approval pending", body: "Refund for cancelled GV2 booking", linkPath: "/approvals", priority: "HIGH" },
    { user: users.admin, event: "SYSTEM", title: "Demo data seeded", body: `All amounts are in ${CURRENCY} (stored as paise).`, linkPath: "/", priority: "LOW", readAt: NOW },
  ];
  for (const n of items) {
    const { user, ...rest } = n;
    await prisma.notification.create({ data: { companyId, userId: user.id, channel: "IN_APP", sentAt: NOW, ...rest } });
  }
  for (const u of [users.admin, users.exec1, users.salesHead]) {
    for (const [event, channel] of [["LEAD_ASSIGNED", "IN_APP"], ["LEAD_ASSIGNED", "WHATSAPP"], ["TASK_OVERDUE", "IN_APP"], ["APPROVAL_PENDING", "EMAIL"]]) {
      await prisma.notificationPreference.create({ data: { companyId, userId: u.id, event, channel, enabled: true } });
    }
  }
}

async function seedTemplatesAndSystem(companyId, users, projects) {
  await prisma.template.createMany({ data: [
    { companyId, name: "Welcome WhatsApp", channel: "WHATSAPP", category: "UTILITY", status: "APPROVED", body: "Hi {{name}}, thanks for your enquiry about {{project}}. Your advisor {{exec}} will call you shortly.", variablesJson: ["name", "project", "exec"] },
    { companyId, name: "Site visit reminder", channel: "WHATSAPP", category: "UTILITY", status: "APPROVED", body: "Reminder: your site visit to {{project}} is scheduled for {{time}}. Reply YES to confirm.", variablesJson: ["project", "time"] },
    { companyId, name: "Payment reminder SMS", channel: "SMS", category: "UTILITY", status: "APPROVED", body: "Dear {{name}}, ₹{{amount}} towards {{unit}} is due on {{date}}. Pay via {{link}}. -EstateOS", variablesJson: ["name", "amount", "unit", "date", "link"] },
    { companyId, name: "Diwali offer blast", channel: "WHATSAPP", category: "MARKETING", status: "PENDING_APPROVAL", body: "This Diwali, own a plot at Green Valley Phase 2 with ₹1 lakh off. Limited period!", variablesJson: [] },
    { companyId, name: "Demand letter email", channel: "EMAIL", category: "UTILITY", status: "APPROVED", subject: "Demand letter {{demandNumber}} — {{project}}", body: "Please find attached the demand letter for ₹{{amount}} due on {{date}}.", variablesJson: ["demandNumber", "project", "amount", "date"] },
  ] });

  await prisma.customFieldDef.createMany({ data: [
    { companyId, entity: "LEAD", key: "vastu_preference", label: "Vastu preference", type: "SELECT", optionsJson: ["Strict", "Flexible", "None"], sortOrder: 1 },
    { companyId, entity: "LEAD", key: "existing_property", label: "Owns property already?", type: "SELECT", optionsJson: ["Yes", "No"], sortOrder: 2 },
    { companyId, entity: "BOOKING", key: "gift_delivered", label: "Welcome gift delivered", type: "SELECT", optionsJson: ["Yes", "No"], sortOrder: 1 },
  ] });

  await prisma.auditLog.createMany({ data: [
    { companyId, actorType: "SYSTEM", action: "SEED", entityType: "COMPANY", entityId: companyId, afterJson: { currency: CURRENCY, seededAt: NOW.toISOString() } },
    { companyId, actorType: "USER", actorId: users.director.id, action: "RATE_CARD_PUBLISH", entityType: "RATE_CARD", entityId: projects.GV2.rateCard.id, afterJson: { version: 2, baseRate: projects.GV2.baseRate.toString(), currency: CURRENCY }, createdAt: daysAgo(90) },
  ] });
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`Seeding EstateOS demo data — currency ${CURRENCY}, money stored as paise (BigInt).`);
  const company = await seedCompany();
  const companyId = company.id;

  console.log("Wiping existing demo-company rows…");
  await wipeCompany(companyId);

  const { users, teams } = await seedRolesAndUsers(companyId);
  console.log(`  users: ${Object.keys(users).length}, teams: ${Object.keys(teams).length}`);

  const projects = await seedProjects(companyId, users);
  console.log(`  projects: ${Object.keys(projects).length}, units: ${Object.values(projects).reduce((n, p) => n + p.units.length, 0)}`);

  const { sources, campaigns } = await seedLeadSourcesAndCampaigns(companyId, projects);
  const brokers = await seedBrokers(companyId, projects);
  const drivers = await seedDrivers(companyId);
  const templates = await seedPaymentPlanTemplates(companyId, projects);
  const offers = await seedOffers(companyId, projects);

  const { leads, bookings } = await seedLeadsAndPipeline({ companyId, users, projects, sources, campaigns, brokers, drivers, templates, offers });
  console.log(`  leads: ${leads.length + 1}, bookings: ${bookings.length}`);

  await seedNotifications(companyId, users);
  await seedTemplatesAndSystem(companyId, users, projects);

  const counts = {};
  for (const m of ["user", "team", "project", "block", "floor", "unit", "rateCard", "plc", "leadSource", "campaign", "broker", "lead", "leadRequirement", "task", "note", "siteVisit", "costSheet", "hold", "token", "approvalRequest", "customer", "booking", "applicant", "demand", "receipt", "receiptAllocation", "ledger", "refund", "commission", "ticket", "notification"]) {
    counts[m] = await prisma[m].count({ where: { companyId } });
  }
  const sales = await prisma.booking.aggregate({ where: { companyId, status: { in: ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"] } }, _sum: { agreementValue: true } });
  const received = await prisma.receipt.aggregate({ where: { companyId, status: "CLEARED" }, _sum: { amount: true } });

  console.log("\nRow counts:");
  console.table(counts);
  console.log(`Active sales value: ${inr(sales._sum.agreementValue || 0n)}`);
  console.log(`Receipts cleared:   ${inr(received._sum.amount || 0n)}`);
  console.log("\nLogins (all users share the company EST):");
  console.log(`  admin  → ${process.env.SEED_ADMIN_EMAIL || "admin@estateos.local"} / ${process.env.SEED_ADMIN_PASSWORD || "Admin@12345"}`);
  console.log(`  others → <firstname.lastname>@estateos.local / ${process.env.SEED_USER_PASSWORD || "Password@123"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
