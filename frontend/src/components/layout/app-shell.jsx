import {
  BadgeIndianRupee,
  Bell,
  Building2,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Headphones,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  SquareKanban,
  Phone,
  UserCircle,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";
import { sections, sectionResources } from "../../lib/routes";
import { useApiData } from "../../hooks/use-api-data";

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function hasSectionAccess(user, sectionKey) {
  // Settings (team members, roles, permissions, workspaces) is admin-only —
  // it isn't governed by the per-resource permission model like every other
  // section, so it needs its own explicit rule rather than the "no gating
  // defined for this id" fallback below.
  if (sectionKey === "settings") return user?.role?.code === "SUPER_ADMIN";
  const section = sectionResources[sectionKey];
  if (!section) return true;
  if (user?.role?.code === "SUPER_ADMIN") return true;
  const permissions = user?.role?.permissionsJson || {};
  const wildcard = permissions["*"];
  if (Array.isArray(wildcard) && wildcard.includes("R")) return true;
  return section.resources.some((resource) => Array.isArray(permissions[resource]) && permissions[resource].includes("R"));
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: UsersRound, badgeKey: "leads" },
  { id: "visits", label: "Site Visits", icon: CalendarClock, badgeKey: "visits" },
  { id: "projects", label: "Projects", icon: SquareKanban },
  { id: "inventory", label: "Inventory", icon: Building2 },
  { id: "bookings", label: "Bookings", icon: ClipboardCheck, badgeKey: "bookings" },
  { id: "customers", label: "Customers", icon: UserCircle },
  { id: "collections", label: "Collections", icon: BadgeIndianRupee, badgeKey: "collections" },
  { id: "brokers", label: "Channel Partners", icon: ShieldCheck },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "calls", label: "Calls & IVR", icon: Headphones, badgeKey: "calls" },
  { id: "inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { id: "reports", label: "Reports", icon: CircleDollarSign },
  { id: "settings", label: "Settings", icon: Settings },
];

const createItems = [
  { label: "Lead", path: "/leads", shortcut: "N" },
  { label: "Site visit", path: "/visits" },
  { label: "Booking", path: "/bookings" },
  { label: "Payment receipt", path: "/collections" },
  { label: "Channel partner", path: "/brokers" },
  { label: "Campaign", path: "/marketing" },
  { label: "Project", path: "/projects" },
  { label: "Scheduled report", path: "/reports" },
];

export function AppShell({ active, navigate, mobileNavOpen, setMobileNavOpen, user, onLogout, activeWorkspaceId, onSwitchWorkspace, children }) {
  const [globalSearch, setGlobalSearch] = useState("");
  const initials = (user?.name || "Priya Sharma")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const displayName = user?.name || "Priya Sharma";
  const roleName = user?.role?.name || "Sales Executive";
  const isSuperAdmin = user?.role?.code === "SUPER_ADMIN";
  const [workspacesResponse] = useApiData("/companies", { data: [] }, { take: 50 }, { enabled: isSuperAdmin });
  const workspaces = Array.isArray(workspacesResponse) ? workspacesResponse : workspacesResponse.data || [];
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const companyName = activeWorkspace?.name || user?.company?.name || "Workspace";
  const bookingTarget = user?.targetsJson?.bookings || 0;
  const [monthBookings, , monthBookingsLoading] = useApiData(
    "/bookings/summary",
    { total: 0 },
    { salesExecId: user?.id, bookedFrom: startOfMonth(new Date()).toISOString(), take: 1 },
    { enabled: Boolean(user?.id) && bookingTarget > 0 }
  );
  const bookingsThisMonth = monthBookings.total || 0;

  const [leadCounts] = useApiData("/leads/counts", {});
  const [visitsCount] = useApiData("/site-visits/count", 0);
  const [bookingsSummary] = useApiData("/bookings/summary", { total: 0 }, { take: 1 });
  const [collectionsSummary] = useApiData("/collections/summary", {});
  const [missedCalls] = useApiData("/calls/missed-queue", { total: 0 });
  const [unreadInbox] = useApiData("/conversations/unread-count", {});
  const [overdueTasks] = useApiData(
    "/tasks",
    { data: [] },
    { assigneeId: user?.id, status: "OPEN", take: 100 },
    { enabled: Boolean(user?.id) }
  );
  const overdueTaskRows = (Array.isArray(overdueTasks) ? overdueTasks : overdueTasks.data || []).filter(
    (task) => new Date(task.dueAt) < new Date()
  );

  const badges = {
    leads: leadCounts.all,
    visits: visitsCount,
    bookings: bookingsSummary.total,
    collections: collectionsSummary.outstandingCount,
    calls: missedCalls.total,
    inbox: unreadInbox.count,
  };
  const notificationCount = overdueTaskRows.length + (badges.calls || 0) + (badges.inbox || 0);

  function go(path) {
    navigate(path);
  }

  function submitGlobalSearch(event) {
    event.preventDefault();
    const query = globalSearch.trim();
    if (!query) return;
    navigate(`/leads?search=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen min-w-[1320px] bg-[#F5F6F8] text-[#101418]">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-[#E2E5EA] bg-white px-4">
        <div className="flex w-56 shrink-0 items-center gap-2.5">
          <div className="font-display grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[#2E5BFF] text-[15px] font-bold text-[#BFCEFF]">
            E
          </div>
          <div className="font-display text-[17px] font-semibold tracking-normal">EstateOS</div>
        </div>
        {isSuperAdmin && workspaces.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#E2E5EA] bg-[#F5F6F8] px-3 text-[13px] font-medium text-[#101418] hover:border-[#C9CED6] hover:bg-white"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#BFCEFF]" />
                {companyName}
                <ChevronDown className="h-3.5 w-3.5 text-[#8B93A1]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
              {workspaces.map((workspace) => {
                const isActive = (activeWorkspaceId || user?.companyId) === workspace.id;
                return (
                  <DropdownMenuItem key={workspace.id} onSelect={() => onSwitchWorkspace?.(workspace.id)}>
                    <span className="flex h-3.5 w-3.5 items-center justify-center">
                      {isActive && <Check className="h-3.5 w-3.5 text-[#2E5BFF]" />}
                    </span>
                    <span className="flex-1 font-medium text-[#101418]">{workspace.name}</span>
                    <span className="font-mono-ui text-[11px] text-[#8B93A1]">{workspace.shortCode}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#E2E5EA] bg-[#F5F6F8] px-3 text-[13px] font-medium text-[#101418]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#BFCEFF]" />
            {companyName}
          </div>
        )}
        <form
          className="flex h-[35px] min-w-[300px] max-w-[520px] flex-1 items-center gap-2.5 rounded-md border border-[#E2E5EA] bg-[#F5F6F8] px-3 text-left text-[13px] text-[#8B93A1] hover:border-[#C9CED6] hover:bg-white focus-within:border-[#C9CED6] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#BFCEFF]"
          onSubmit={submitGlobalSearch}
        >
          <Search className="h-4 w-4" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#101418] outline-none placeholder:text-[#8B93A1]"
            value={globalSearch}
            placeholder="Search leads, units, bookings..."
            onChange={(event) => setGlobalSearch(event.target.value)}
          />
          <span className="font-mono-ui rounded border border-[#E2E5EA] bg-white px-1.5 py-0.5 text-[11px]">Ctrl K</span>
        </form>
        <div className="flex flex-1 justify-end" />
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>+ Create</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[334px]">
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              {createItems.map((item) => (
                <DropdownMenuItem key={item.label} onSelect={() => go(item.path)}>
                  <Clock3 className="h-3.5 w-3.5 text-[#8B93A1]" />
                  <span className="flex-1 font-medium text-[#101418]">{item.label}</span>
                  {item.shortcut && <span className="font-mono-ui text-[11px] text-[#8B93A1]">Ctrl {item.shortcut}</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="font-mono-ui absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              {notificationCount === 0 && (
                <div className="px-3 py-4 text-sm text-[#8B93A1]">Nothing needs your attention.</div>
              )}
              {overdueTaskRows.length > 0 && (
                <DropdownMenuItem onSelect={() => go("/dashboard")}>
                  <Clock3 className="h-3.5 w-3.5 text-[#8B93A1]" />
                  <span className="flex-1 font-medium text-[#101418]">
                    {overdueTaskRows.length} overdue follow-up{overdueTaskRows.length === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono-ui text-[11px] text-[#8B93A1]">Needs action today</span>
                </DropdownMenuItem>
              )}
              {Boolean(badges.calls) && (
                <DropdownMenuItem onSelect={() => go("/calls")}>
                  <Clock3 className="h-3.5 w-3.5 text-[#8B93A1]" />
                  <span className="flex-1 font-medium text-[#101418]">
                    {badges.calls} missed call{badges.calls === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono-ui text-[11px] text-[#8B93A1]">Open Calls & IVR</span>
                </DropdownMenuItem>
              )}
              {Boolean(badges.inbox) && (
                <DropdownMenuItem onSelect={() => go("/inbox")}>
                  <Clock3 className="h-3.5 w-3.5 text-[#8B93A1]" />
                  <span className="flex-1 font-medium text-[#101418]">
                    {badges.inbox} unread conversation{badges.inbox === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono-ui text-[11px] text-[#8B93A1]">Open Inbox</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="relative">
                <Phone className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full border-2 border-white bg-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72">
              <DropdownMenuLabel>Dialer</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => go("/calls")}>
                <Clock3 className="h-3.5 w-3.5 text-[#8B93A1]" />
                <span className="flex-1 font-medium text-[#101418]">Outbound dialing</span>
                <span className="font-mono-ui text-[11px] text-[#8B93A1]">Not connected yet</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => go("/calls")}>
                <Clock3 className="h-3.5 w-3.5 text-[#8B93A1]" />
                <span className="flex-1 font-medium text-[#101418]">Missed callbacks</span>
                <span className="font-mono-ui text-[11px] text-[#8B93A1]">{badges.calls || 0} open</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-1 flex items-center gap-2 border-l border-[#E2E5EA] pl-3">
            <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#E8EDFF] text-xs font-bold text-[#2E5BFF]">
              {initials}
            </div>
            <div className="leading-[14px]">
              <div className="text-[12.5px] font-semibold">{displayName}</div>
              <div className="text-[11px] text-[#8B93A1]">{roleName}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex items-start">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-[#E2E5EA] bg-white py-3 transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#8B93A1]">Workspace</div>
        <nav className="space-y-0.5 px-2">
          {navItems.filter((item) => hasSectionAccess(user, item.id)).map((item) => {
            const Icon = item.icon;
            const badgeValue = item.badgeKey ? badges[item.badgeKey] : null;
            return (
              <button
                key={item.id}
                className={cn(
                  "relative flex h-[38px] w-full items-center gap-2.5 rounded-[7px] px-3 text-left text-[13px] font-medium text-[#5B6472] hover:bg-[#EEF0F3] hover:text-[#101418]",
                  active === item.id && "bg-[#E8EDFF] font-semibold text-[#2E5BFF]"
                )}
                onClick={() => {
                  navigate(sections[item.id].path);
                  setMobileNavOpen(false);
                }}
              >
                <span className={cn("absolute left-0 h-5 w-0.5 rounded-r bg-transparent", active === item.id && "bg-[#2E5BFF]")} />
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {Boolean(badgeValue) && (
                  <span className={cn("font-mono-ui rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold", active === item.id ? "bg-white text-[#2E5BFF]" : "bg-[#EEF0F3] text-[#8B93A1]")}>
                    {badgeValue}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="flex-1" />
        {bookingTarget > 0 && (
          <div className="mt-auto mx-3 rounded-[10px] border border-[#E2E5EA] bg-[#F5F6F8] p-3">
            <div className="text-[11px] font-semibold text-[#5B6472]">Month target</div>
            <div className="my-1 flex items-baseline gap-1.5">
              <span className="font-mono-ui text-[19px] font-semibold">{monthBookingsLoading ? "…" : bookingsThisMonth}</span>
              <span className="text-xs text-[#8B93A1]">/ {bookingTarget} bookings</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-[#E2E5EA]">
              <div
                className="h-full bg-[#2E5BFF]"
                style={{ width: `${Math.min(100, Math.round((bookingsThisMonth / bookingTarget) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 px-[30px] py-[26px] pb-[72px]">
        {children}
      </main>
      </div>
    </div>
  );
}

