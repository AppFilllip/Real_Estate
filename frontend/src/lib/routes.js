export const sections = {
  dashboard: { path: "/", title: "Dashboard" },
  leads: {
    path: "/leads",
    title: "Leads",
    endpoint: "/leads",
    columns: ["name", "phone", "project.name", "stage", "source.name", "owner.name", "score", "lastActivityAt", "nextFollowUpAt"],
  },
  visits: { path: "/visits", title: "Site Visits", endpoint: "/site-visits", columns: ["scheduledAt", "status", "type", "leadId", "projectId"] },
  projects: { path: "/projects", title: "Projects", endpoint: "/projects", columns: ["name", "shortCode", "type", "status", "city"] },
  inventory: { path: "/inventory", title: "Inventory", endpoint: "/units", columns: ["unitCode", "number", "status", "area", "areaUnit"] },
  bookings: { path: "/bookings", title: "Bookings", endpoint: "/bookings", columns: ["bookingNumber", "status", "agreementValue", "bookedOn"] },
  customers: { path: "/customers", title: "Customers", endpoint: "/customers", columns: ["name", "phone", "email", "portalAccessEnabled", "relationshipManagerId"] },
  collections: { path: "/collections", title: "Collections" },
  brokers: { path: "/brokers", title: "Brokers", endpoint: "/brokers", columns: ["contactPerson", "phone", "firmName", "status", "tier"] },
  marketing: { path: "/marketing", title: "Marketing", endpoint: "/campaigns", columns: ["name", "channel", "budget", "spend", "startDate"] },
  calls: { path: "/calls", title: "Calls & IVR", endpoint: "/calls", columns: ["direction", "status", "fromNumber", "toNumber", "startedAt"] },
  inbox: { path: "/inbox", title: "Inbox", endpoint: "/conversations", columns: ["channel", "status", "contactValue", "unreadCount", "lastMessageAt"] },
  tasks: { path: "/tasks", title: "Tasks", endpoint: "/tasks", columns: ["title", "type", "status", "dueAt", "assigneeId"] },
  reports: { path: "/reports", title: "Reports" },
  settings: { path: "/settings", title: "Settings" },
};

export const detailRoutes = {
  leads: { ...sections.leads, sectionKey: "leads" },
  projects: { ...sections.projects, sectionKey: "projects" },
  inventory: { ...sections.inventory, sectionKey: "inventory" },
  bookings: { ...sections.bookings, sectionKey: "bookings" },
  customers: { ...sections.customers, sectionKey: "customers" },
  receipts: { title: "Receipts", endpoint: "/receipts", path: "/collections/receipts", sectionKey: "collections" },
  brokers: { ...sections.brokers, sectionKey: "brokers" },
  marketing: { ...sections.marketing, sectionKey: "marketing" },
  calls: { ...sections.calls, sectionKey: "calls" },
  inbox: { ...sections.inbox, sectionKey: "inbox" },
  tasks: { ...sections.tasks, sectionKey: "tasks" },
  users: { title: "Users", endpoint: "/users", path: "/settings", sectionKey: "settings" },
  roles: { title: "Roles", endpoint: "/roles", path: "/settings", sectionKey: "settings" },
  workspaces: { title: "Workspaces", endpoint: "/companies", path: "/settings", sectionKey: "settings" },
};

// Maps each nav section to the backend permission resource key(s) that gate it.
// Keys here are the literal first URL segment under /api/ (see backend
// modules/index.js) — they must match what authorizeRequest checks, not the
// frontend's own naming. A section with several keys (e.g. Collections) is
// gated by all of them together: one toggle in the Permissions UI sets every
// key in the group at once.
export const sectionResources = {
  leads: { label: "Leads", resources: ["leads"] },
  visits: { label: "Site Visits", resources: ["site-visits"] },
  projects: { label: "Projects", resources: ["projects"] },
  inventory: { label: "Inventory", resources: ["units", "rate-cards"] },
  bookings: { label: "Bookings", resources: ["bookings"] },
  customers: { label: "Customers", resources: ["customers"] },
  collections: { label: "Collections", resources: ["demands", "receipts", "refunds", "ledger"] },
  brokers: { label: "Channel Partners", resources: ["brokers"] },
  marketing: { label: "Marketing", resources: ["campaigns"] },
  calls: { label: "Calls & IVR", resources: ["calls"] },
  inbox: { label: "Inbox", resources: ["conversations"] },
  reports: { label: "Reports", resources: ["reports"] },
};

export function sectionFromPath(pathname) {
  const cleanPath = pathname.split("?")[0];
  const match = Object.entries(sections).find(([, section]) => section.path === cleanPath);
  return match ? match[0] : null;
}

export function parseDetailPath(pathname) {
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  if (parts.length === 2 && detailRoutes[parts[0]]) {
    return { key: parts[0], id: parts[1], ...detailRoutes[parts[0]] };
  }
  if (parts.length === 3 && parts[0] === "collections" && parts[1] === "receipts") {
    return { key: "receipts", id: parts[2], ...detailRoutes.receipts };
  }
  return null;
}
