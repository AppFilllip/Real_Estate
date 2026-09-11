import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { money } from "../../lib/utils";

const emptyDashboard = {
  cards: {
    totalLeads: 0,
    newLeadsToday: 0,
    siteVisitsToday: 0,
    activeBookings: 0,
    salesValue: "0",
    collectionDue: "0",
    openTickets: 0,
    pendingApprovals: 0,
    commissionPayable: "0",
  },
};

const VISIT_STATUS_TONE = {
  SCHEDULED: "blue",
  CONFIRMED: "green",
  RESCHEDULED: "amber",
  VISITED: "green",
  NO_SHOW: "red",
  CANCELLED: "slate",
};

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function DashboardScreen({ user, navigate }) {
  const hasUser = Boolean(user?.id);

  const [dashboard, , , dashboardError] = useApiData("/reports/dashboard", emptyDashboard);
  const cards = dashboard.cards || emptyDashboard.cards;

  const [tasksResponse, , tasksLoading, , reloadTasks] = useApiData(
    "/tasks",
    { data: [] },
    { assigneeId: user?.id, status: "OPEN", take: 100 },
    { enabled: hasUser }
  );
  const tasks = (Array.isArray(tasksResponse) ? tasksResponse : tasksResponse.data || [])
    .slice()
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const now = new Date();
  const dueSoonTasks = tasks.filter((task) => new Date(task.dueAt) <= endOfDay(now)).slice(0, 6);
  const overdueCount = tasks.filter((task) => new Date(task.dueAt) < startOfDay(now)).length;
  const dueTodayCount = tasks.filter((task) => {
    const due = new Date(task.dueAt);
    return due >= startOfDay(now) && due <= endOfDay(now);
  }).length;

  const [leadsResponse] = useApiData(
    "/leads",
    { data: [] },
    { ownerId: user?.id, take: 100 },
    { enabled: hasUser }
  );
  const myLeads = Array.isArray(leadsResponse) ? leadsResponse : leadsResponse.data || [];
  const unworkedLeads = myLeads
    .filter((lead) => !lead.firstResponseAt)
    .sort((a, b) => new Date(a.slaDueAt || 0) - new Date(b.slaDueAt || 0))
    .slice(0, 5);
  const funnel = Object.entries(
    myLeads.reduce((acc, lead) => {
      acc[lead.stage] = (acc[lead.stage] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const funnelMax = Math.max(1, ...funnel.map(([, count]) => count));

  const [visitsResponse, , visitsLoading, , reloadVisits] = useApiData(
    "/site-visits",
    { data: [] },
    { execId: user?.id, take: 200 },
    { enabled: hasUser }
  );
  const todaysVisits = (Array.isArray(visitsResponse) ? visitsResponse : visitsResponse.data || [])
    .filter((visit) => {
      const at = new Date(visit.scheduledAt);
      return at >= startOfDay(now) && at <= endOfDay(now);
    })
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  function showUnavailable(label) {
    toast.error(`${label} is not connected yet.`);
  }

  async function markTaskDone(task) {
    try {
      await api.patch(`/tasks/${task.id}/done`, {});
      reloadTasks();
      toast.success("Task marked done");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not update task.");
    }
  }

  async function checkInVisit(visit) {
    try {
      await api.patch(`/site-visits/${visit.id}/check-in`, {});
      reloadVisits();
      toast.success("Checked in to visit");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not check in.");
    }
  }

  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-0.5 text-xs text-[#8B93A1]">Dashboard / My day</div>
          <h1 className="font-display m-0 text-2xl font-semibold leading-8 tracking-normal text-[#101418]">
            Good morning{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#5B6472]">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E2E5EA] px-5 py-4">
              <div className="text-base font-semibold">Overdue &amp; due today</div>
              <div className="flex gap-1.5 font-mono-ui text-[11px]">
                <span className="rounded-full bg-[#FCE8E8] px-2 py-0.5 font-semibold text-[#DC2626]">{overdueCount} overdue</span>
                <span className="rounded-full bg-[#FDF1E1] px-2 py-0.5 font-semibold text-[#D97706]">{dueTodayCount} today</span>
              </div>
            </div>
            {tasksLoading ? (
              <div className="flex flex-col gap-2 p-5">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : dueSoonTasks.length === 0 ? (
              <div className="p-5 text-sm text-[#5B6472]">Nothing overdue or due today.</div>
            ) : (
              dueSoonTasks.map((task) => {
                const overdue = new Date(task.dueAt) < startOfDay(now);
                return (
                  <div key={task.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-5 py-3 last:border-b-0">
                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${overdue ? "bg-[#DC2626]" : "bg-[#D97706]"}`} />
                    <div className="w-14 flex-none font-mono-ui text-xs text-[#5B6472]">{formatTime(task.dueAt)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-[#101418]">{task.title || humanize(task.type)}</div>
                      <div className="mt-0.5 text-[11.5px] text-[#8B93A1]">{humanize(task.type)}{task.note ? ` · ${task.note}` : ""}</div>
                    </div>
                    <div className="flex flex-none gap-1.5">
                      <Button size="sm" onClick={() => showUnavailable("Call")}>Call</Button>
                      <Button variant="secondary" size="sm" onClick={() => showUnavailable("WhatsApp")}>WhatsApp</Button>
                      <Button variant="secondary" size="sm" onClick={() => markTaskDone(task)}>Done</Button>
                    </div>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#E2E5EA] px-5 py-4">
              <div className="text-base font-semibold">New leads assigned — unworked</div>
              <div className="text-xs text-[#8B93A1]">First response pending</div>
            </div>
            {unworkedLeads.length === 0 ? (
              <div className="p-5 text-sm text-[#5B6472]">Nothing unworked right now.</div>
            ) : (
              unworkedLeads.map((lead) => {
                const breached = lead.slaBreached || (lead.slaDueAt && new Date(lead.slaDueAt) < now);
                return (
                  <div key={lead.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-4.5 py-3.5 last:border-b-0">
                    <Badge tone={breached ? "red" : "amber"}>{breached ? "Breached" : "SLA"}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-[#101418]">{lead.name}</div>
                      <div className="text-[11.5px] text-[#8B93A1]">{[lead.source?.name, lead.city].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span className="font-mono-ui text-xs text-[#5B6472]">{lead.phone}</span>
                    <Button variant="secondary" size="sm" onClick={() => showUnavailable("Call")}>Call now</Button>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-semibold">Today's site visits</div>
              <button
                type="button"
                onClick={() => navigate?.("/visits")}
                className="border-0 bg-transparent text-[12.5px] font-semibold text-[#2E5BFF]"
              >
                Open calendar →
              </button>
            </div>
            {visitsLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : todaysVisits.length === 0 ? (
              <p className="text-sm text-[#5B6472]">No visits scheduled for today.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {todaysVisits.map((visit) => {
                  const canCheckIn = ["SCHEDULED", "CONFIRMED", "RESCHEDULED"].includes(visit.status) && !visit.checkedInAt;
                  return (
                    <div key={visit.id} className="flex items-center gap-3 rounded-lg border border-[#E2E5EA] border-l-[3px] border-l-[#2E5BFF] bg-[#F5F6F8] p-3.5">
                      <div className="w-13 font-mono-ui text-[13px] font-semibold">{formatTime(visit.scheduledAt)}</div>
                      <div className="flex-1">
                        <div className="text-[13.5px] font-semibold">{visit.lead?.name || "Lead"}</div>
                        <div className="text-[11.5px] text-[#5B6472]">{visit.project?.name}</div>
                      </div>
                      <Badge tone={VISIT_STATUS_TONE[visit.status] || "slate"}>{humanize(visit.status)}</Badge>
                      <Button variant="secondary" size="sm" disabled={!canCheckIn} onClick={() => checkInVisit(visit)}>
                        Check-in
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-4.5">
            <div className="mb-3 text-base font-semibold">My funnel</div>
            {funnel.length === 0 ? (
              <p className="text-sm text-[#5B6472]">No leads assigned yet.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {funnel.map(([stage, count]) => (
                  <div key={stage}>
                    <div className="mb-0.5 flex justify-between text-xs">
                      <span className="text-[#5B6472]">{humanize(stage)}</span>
                      <span className="font-mono-ui font-semibold">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-[#EEF0F3]">
                      <div className="h-full bg-[#2E5BFF]" style={{ width: `${(count / funnelMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {!dashboardError && (
            <Card className="p-4.5">
              <div className="mb-3 text-base font-semibold">Today at a glance</div>
              <div className="flex flex-col gap-2.5 text-[13px]">
                <GlanceRow label="Site visits today" value={cards.siteVisitsToday} />
                <GlanceRow label="Active bookings" value={cards.activeBookings} />
                <GlanceRow label="Collection due" value={money(cards.collectionDue)} />
                <GlanceRow label="Open tickets" value={cards.openTickets} />
                <GlanceRow label="Pending approvals" value={cards.pendingApprovals} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function GlanceRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[#EEF0F3] pb-2.5 last:border-b-0 last:pb-0">
      <span className="text-[#5B6472]">{label}</span>
      <span className="font-mono-ui font-semibold text-[#101418]">{value}</span>
    </div>
  );
}

export function Screen({ title, description, children }) {
  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <div className="mb-0.5 text-xs text-[#8B93A1]">EstateOS / {title}</div>
        <h1 className="font-display m-0 text-2xl font-semibold leading-8 tracking-normal text-[#101418]">{title}</h1>
        <p className="mt-0.5 text-[13px] text-[#5B6472]">{description}</p>
      </div>
      {children}
    </section>
  );
}

