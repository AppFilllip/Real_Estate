import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { Screen } from "../dashboard/dashboard-screen";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const VISIT_TYPES = ["SITE", "SAMPLE_FLAT", "OFFICE", "VIRTUAL"];
const VISIT_RESULTS = ["VERY_INTERESTED", "INTERESTED", "NEEDS_TIME", "NOT_INTERESTED"];
const BUDGET_FITS = ["YES", "STRETCH", "NO"];

const STATUS_TONE = {
  SCHEDULED: { fg: "#2E5BFF", bg: "#E8EDFF", badge: "blue" },
  CONFIRMED: { fg: "#0D9488", bg: "#DBF3F0", badge: "green" },
  RESCHEDULED: { fg: "#B45309", bg: "#FEF3C7", badge: "amber" },
  VISITED: { fg: "#15803D", bg: "#DCFCE7", badge: "green" },
  NO_SHOW: { fg: "#DC2626", bg: "#FEE2E2", badge: "red" },
  CANCELLED: { fg: "#5B6472", bg: "#EEF0F3", badge: "slate" },
};

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function addMonths(date, delta) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

// Every Monday that the given month's calendar grid touches — used both to
// lay out the month view's rows and to populate the "week" jump-to select.
function weeksInMonth(monthStart) {
  const monthEndExclusive = addMonths(monthStart, 1);
  const weeks = [];
  let cursor = startOfWeek(monthStart);
  while (cursor.getTime() < monthEndExclusive.getTime()) {
    weeks.push(new Date(cursor));
    cursor = new Date(cursor.getTime() + 7 * DAY_MS);
  }
  return weeks;
}

// A rolling ±12 month window centered on whichever month is currently in
// view, so the "jump to month" select always includes the current one even
// after paging far away from today via the prev/next arrows.
function monthOptions(center) {
  return Array.from({ length: 25 }, (_, i) => addMonths(center, i - 12));
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRange(start) {
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return `Week of ${fmt(start)} – ${fmt(end)}`;
}

function formatWeekOption(start) {
  const end = new Date(start.getTime() + 6 * DAY_MS);
  const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatMonth(date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function toDatetimeLocal(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function SiteVisitsScreen() {
  const [viewMode, setViewMode] = useState("week"); // "week" | "month"
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [projectId, setProjectId] = useState("");
  const [execId, setExecId] = useState("");
  const [scheduleDialog, setScheduleDialog] = useState({ open: false, defaultAt: null });
  const [detailVisit, setDetailVisit] = useState(null);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const monthStart = useMemo(() => startOfMonth(anchorDate), [anchorDate]);
  const periodStart = viewMode === "month" ? monthStart : weekStart;
  const periodEnd = viewMode === "month" ? addMonths(monthStart, 1) : new Date(weekStart.getTime() + 7 * DAY_MS);
  const priorPeriodStart = viewMode === "month" ? addMonths(monthStart, -1) : new Date(weekStart.getTime() - 7 * DAY_MS);

  const [projects] = useApiData("/projects", { data: [] }, { take: 100 });
  const [users] = useApiData("/users", { data: [] }, { take: 100 });
  const projectRows = Array.isArray(projects) ? projects : projects.data || [];
  const userRows = Array.isArray(users) ? users : users.data || [];

  const params = { take: 500, ...(projectId ? { projectId } : {}), ...(execId ? { execId } : {}) };
  const [visitsResponse, , loading, error, reload] = useApiData("/site-visits", { data: [] }, params);
  const visits = Array.isArray(visitsResponse) ? visitsResponse : visitsResponse.data || [];

  const weekVisits = useMemo(
    () => visits.filter((v) => {
      const t = new Date(v.scheduledAt).getTime();
      return t >= periodStart.getTime() && t < periodEnd.getTime();
    }),
    [visits, periodStart, periodEnd]
  );
  const priorWeekCount = useMemo(
    () => visits.filter((v) => {
      const t = new Date(v.scheduledAt).getTime();
      return t >= priorPeriodStart.getTime() && t < periodStart.getTime();
    }).length,
    [visits, priorPeriodStart, periodStart]
  );

  const revisitLeadIds = useMemo(() => {
    const firstVisitAt = new Map();
    for (const v of visits) {
      const t = new Date(v.scheduledAt).getTime();
      if (!firstVisitAt.has(v.leadId) || t < firstVisitAt.get(v.leadId)) firstVisitAt.set(v.leadId, t);
    }
    return new Set(
      visits.filter((v) => new Date(v.scheduledAt).getTime() > firstVisitAt.get(v.leadId)).map((v) => v.id)
    );
  }, [visits]);

  const completed = weekVisits.filter((v) => v.status === "VISITED").length;
  const noShow = weekVisits.filter((v) => v.status === "NO_SHOW").length;
  const revisits = weekVisits.filter((v) => revisitLeadIds.has(v.id)).length;
  const scheduledDelta = weekVisits.length - priorWeekCount;
  const periodLabel = viewMode === "month" ? "this month" : "this week";

  const pct = (n) => (weekVisits.length ? `${Math.round((n / weekVisits.length) * 100)}%` : "—");

  const kpis = [
    { label: `Scheduled ${periodLabel}`, value: weekVisits.length, delta: scheduledDelta === 0 ? "No change vs last" : `${scheduledDelta > 0 ? "+" : ""}${scheduledDelta} vs last`, tone: scheduledDelta >= 0 ? "#15803D" : "#DC2626" },
    { label: "Completed", value: completed, delta: `${pct(completed)} show-up`, tone: "#15803D" },
    { label: "No-show", value: noShow, delta: pct(noShow), tone: "#DC2626" },
    { label: "Revisits", value: revisits, delta: pct(revisits), tone: "#2E5BFF" },
  ];

  const hours = useMemo(() => {
    const found = new Set(DEFAULT_HOURS);
    for (const v of weekVisits) found.add(new Date(v.scheduledAt).getHours());
    return Array.from(found).sort((a, b) => a - b);
  }, [weekVisits]);

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
  const monthWeeks = useMemo(() => weeksInMonth(monthStart), [monthStart]);

  function visitsFor(day, hour) {
    return weekVisits.filter((v) => {
      const at = new Date(v.scheduledAt);
      return at.toDateString() === day.toDateString() && at.getHours() === hour;
    });
  }

  function visitsForDay(day) {
    return visits.filter((v) => new Date(v.scheduledAt).toDateString() === day.toDateString());
  }

  function goPrev() {
    setAnchorDate((d) => (viewMode === "month" ? addMonths(d, -1) : new Date(d.getTime() - 7 * DAY_MS)));
  }

  function goNext() {
    setAnchorDate((d) => (viewMode === "month" ? addMonths(d, 1) : new Date(d.getTime() + 7 * DAY_MS)));
  }

  function jumpToMonth(event) {
    const target = new Date(Number(event.target.value));
    setAnchorDate(target);
  }

  function jumpToWeek(event) {
    setAnchorDate(new Date(Number(event.target.value)));
  }

  function openDayInWeekView(day) {
    setAnchorDate(day);
    setViewMode("week");
  }

  async function reloadAndClose() {
    await reload();
    setDetailVisit(null);
    setScheduleDialog({ open: false, defaultAt: null });
  }

  return (
    <Screen title="Site Visits" description={viewMode === "month" ? formatMonth(monthStart) : formatRange(weekStart)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setAnchorDate(new Date())}>
              {viewMode === "month" ? "This month" : "This week"}
            </Button>
            <Button variant="secondary" size="icon" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-[#E2E5EA] bg-white p-0.5">
            <Button variant={viewMode === "week" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("week")}>
              Week
            </Button>
            <Button variant={viewMode === "month" ? "default" : "ghost"} size="sm" onClick={() => setViewMode("month")}>
              Month
            </Button>
          </div>
          <Select className="w-40" value={String(monthStart.getTime())} onChange={jumpToMonth}>
            {monthOptions(monthStart).map((m) => (
              <option key={m.getTime()} value={m.getTime()}>{formatMonth(m)}</option>
            ))}
          </Select>
          {viewMode === "week" && (
            <Select className="w-44" value={String(weekStart.getTime())} onChange={jumpToWeek}>
              {monthWeeks.map((w) => (
                <option key={w.getTime()} value={w.getTime()}>{formatWeekOption(w)}</option>
              ))}
            </Select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-44" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projectRows.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select className="w-40" value={execId} onChange={(e) => setExecId(e.target.value)}>
            <option value="">All execs</option>
            {userRows.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
          <Button size="sm" onClick={() => setScheduleDialog({ open: true, defaultAt: null })}>
            <Plus className="h-4 w-4" />
            Schedule visit
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-[11.5px] font-semibold text-[#5B6472]">{k.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono-ui text-[21px] font-semibold">{loading ? "…" : k.value}</span>
              <span className="text-[11.5px] font-semibold" style={{ color: k.tone }}>{k.delta}</span>
            </div>
          </Card>
        ))}
      </div>

      {viewMode === "week" ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 920 }}>
              <div className="grid border-b border-[#E2E5EA] bg-[#EEF0F3]" style={{ gridTemplateColumns: "72px repeat(7, 1fr)" }}>
                <div className="p-2.5 text-[11px] font-bold text-[#8B93A1]">IST</div>
                {days.map((d) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div key={d.toISOString()} className="border-l border-[#E2E5EA] p-2.5" style={{ background: isToday ? "#fff" : "transparent" }}>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">
                        {d.toLocaleDateString("en-IN", { weekday: "short" })}
                      </div>
                      <div className="font-mono-ui text-[14px] font-semibold">{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
              {loading && (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}
              {!loading &&
                hours.map((hour) => (
                  <div key={hour} className="grid border-b border-[#EEF0F3]" style={{ gridTemplateColumns: "72px repeat(7, 1fr)", minHeight: 64 }}>
                    <div className="font-mono-ui border-r border-[#EEF0F3] p-2 text-[11.5px] text-[#8B93A1]">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    {days.map((d) => {
                      const cellVisits = visitsFor(d, hour);
                      const isToday = d.toDateString() === new Date().toDateString();
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          className="flex flex-col gap-1 border-l border-[#EEF0F3] p-1.5 text-left"
                          style={{ background: isToday ? "#FBFCFD" : "#fff" }}
                          onClick={() => {
                            if (cellVisits.length) return;
                            const at = new Date(d);
                            at.setHours(hour, 0, 0, 0);
                            setScheduleDialog({ open: true, defaultAt: at });
                          }}
                        >
                          {cellVisits.map((v) => {
                            const tone = STATUS_TONE[v.status] || STATUS_TONE.SCHEDULED;
                            return (
                              <span
                                key={v.id}
                                role="button"
                                tabIndex={0}
                                className="block overflow-hidden rounded-md px-2 py-1 text-left"
                                style={{ background: tone.bg, color: tone.fg, borderLeft: `3px solid ${tone.fg}` }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDetailVisit(v);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter" && event.key !== " ") return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setDetailVisit(v);
                                }}
                              >
                                <span className="block truncate text-[11.5px] font-semibold">{v.lead?.name || "Unknown lead"}</span>
                                <span className="block truncate text-[10.5px] opacity-75">
                                  {v.project?.shortCode || ""} · {humanize(v.type)}
                                </span>
                              </span>
                            );
                          })}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 920 }}>
              <div className="grid border-b border-[#E2E5EA] bg-[#EEF0F3]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                  <div key={label} className="border-l border-[#E2E5EA] p-2 text-[11px] font-bold uppercase tracking-wide text-[#8B93A1] first:border-l-0">
                    {label}
                  </div>
                ))}
              </div>
              {loading && (
                <div className="space-y-2 p-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )}
              {!loading &&
                monthWeeks.map((weekRowStart) => (
                  <div key={weekRowStart.getTime()} className="grid border-b border-[#EEF0F3]" style={{ gridTemplateColumns: "repeat(7, 1fr)", minHeight: 108 }}>
                    {Array.from({ length: 7 }, (_, i) => new Date(weekRowStart.getTime() + i * DAY_MS)).map((d) => {
                      const inMonth = d.getMonth() === monthStart.getMonth();
                      const isToday = d.toDateString() === new Date().toDateString();
                      const dayVisits = visitsForDay(d);
                      const shown = dayVisits.slice(0, 3);
                      const overflow = dayVisits.length - shown.length;
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          className="flex flex-col gap-1 border-l border-[#EEF0F3] p-1.5 text-left first:border-l-0"
                          style={{ background: isToday ? "#FBFCFD" : "#fff", opacity: inMonth ? 1 : 0.45 }}
                          onClick={() => openDayInWeekView(d)}
                        >
                          <span className="font-mono-ui text-[12px] font-semibold text-[#5B6472]">{d.getDate()}</span>
                          {shown.map((v) => {
                            const tone = STATUS_TONE[v.status] || STATUS_TONE.SCHEDULED;
                            return (
                              <span
                                key={v.id}
                                role="button"
                                tabIndex={0}
                                className="block truncate rounded px-1.5 py-0.5 text-left text-[10.5px] font-semibold"
                                style={{ background: tone.bg, color: tone.fg }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDetailVisit(v);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter" && event.key !== " ") return;
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setDetailVisit(v);
                                }}
                              >
                                {v.lead?.name || "Unknown lead"}
                              </span>
                            );
                          })}
                          {overflow > 0 && <span className="text-[10.5px] font-semibold text-[#8B93A1]">+{overflow} more</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>
        </Card>
      )}

      {scheduleDialog.open && (
        <ScheduleVisitDialog
          defaultAt={scheduleDialog.defaultAt}
          projects={projectRows}
          users={userRows}
          onClose={() => setScheduleDialog({ open: false, defaultAt: null })}
          onScheduled={reloadAndClose}
          onError={(message) => toast.error(message)}
        />
      )}

      {detailVisit && (
        <VisitDetailDialog
          visit={detailVisit}
          onClose={() => setDetailVisit(null)}
          onChanged={reloadAndClose}
          onError={(message) => toast.error(message)}
        />
      )}
    </Screen>
  );
}

function ScheduleVisitDialog({ defaultAt, projects, users, onClose, onScheduled, onError }) {
  const [leads, setLeads] = useState([]);
  const [values, setValues] = useState({
    projectId: "",
    leadId: "",
    execId: "",
    scheduledAt: toDatetimeLocal(defaultAt || new Date(Date.now() + 3600000)),
    type: "SITE",
    pickupRequired: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/leads", { params: { take: 100 } }).then((response) => {
      if (active) setLeads(response.data.data || []);
    });
    return () => { active = false; };
  }, []);

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!values.projectId || !values.leadId || !values.execId || !values.scheduledAt) {
      toast.error("Project, lead, exec, and date/time are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/site-visits", {
        projectId: values.projectId,
        leadId: values.leadId,
        execId: values.execId,
        scheduledAt: new Date(values.scheduledAt).toISOString(),
        type: values.type,
        pickupRequired: values.pickupRequired,
        notes: values.notes || undefined,
      });
      toast.success("Visit scheduled.");
      await onScheduled();
    } catch (err) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || "Could not schedule visit.";
      onError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open title="Schedule visit" description="Book a site visit for a lead." onClose={onClose} className="max-w-2xl">
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project" required>
            <Select value={values.projectId} onChange={(e) => setValue("projectId", e.target.value)} required>
              <option value="">Select</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Lead" required>
            <Select value={values.leadId} onChange={(e) => setValue("leadId", e.target.value)} required>
              <option value="">Select</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.phone}</option>)}
            </Select>
          </Field>
          <Field label="Sales exec" required>
            <Select value={values.execId} onChange={(e) => setValue("execId", e.target.value)} required>
              <option value="">Select</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
          <Field label="Date and time" required>
            <Input type="datetime-local" value={values.scheduledAt} onChange={(e) => setValue("scheduledAt", e.target.value)} required />
          </Field>
          <Field label="Visit type">
            <Select value={values.type} onChange={(e) => setValue("type", e.target.value)}>
              {VISIT_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </Select>
          </Field>
          <Field label="Pickup required">
            <label className="flex h-[38px] items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={values.pickupRequired} onChange={(e) => setValue("pickupRequired", e.target.checked)} />
              Arrange pickup for this visit
            </label>
          </Field>
        </div>
        <Field label="Notes">
          <Input value={values.notes} onChange={(e) => setValue("notes", e.target.value)} placeholder="Optional" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Scheduling…" : "Schedule visit"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function VisitDetailDialog({ visit, onClose, onChanged, onError }) {
  const [mode, setMode] = useState(null); // null | "reschedule" | "cancel" | "outcome"
  const [busy, setBusy] = useState(false);
  const [rescheduleAt, setRescheduleAt] = useState(toDatetimeLocal(new Date(Date.now() + 86400000)));
  const [cancelReason, setCancelReason] = useState("");
  const [outcome, setOutcome] = useState({ result: "INTERESTED", budgetFit: "YES", nextStep: "", nextFollowUpAt: toDatetimeLocal(new Date(Date.now() + 86400000)), notes: "" });

  const tone = STATUS_TONE[visit.status] || STATUS_TONE.SCHEDULED;

  async function run(action, successMessage) {
    setBusy(true);
    try {
      await action();
      await onChanged();
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      const message = err.response?.data?.error?.message || err.response?.data?.message || "Action failed.";
      onError(message);
    } finally {
      setBusy(false);
    }
  }

  const canConfirm = ["SCHEDULED", "RESCHEDULED"].includes(visit.status);
  const canReschedule = ["SCHEDULED", "CONFIRMED", "RESCHEDULED", "NO_SHOW"].includes(visit.status);
  const canCancel = !["VISITED", "CANCELLED"].includes(visit.status);
  const canCheckIn = ["SCHEDULED", "CONFIRMED", "RESCHEDULED"].includes(visit.status) && !visit.checkedInAt;
  const canMarkNoShow = !["VISITED", "CANCELLED"].includes(visit.status);
  const canRecordOutcome = visit.status !== "VISITED" && visit.status !== "CANCELLED" && !visit.outcome;

  return (
    <Dialog open title="Visit detail" onClose={onClose} className="max-w-xl">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-950">{visit.lead?.name || "Unknown lead"}</p>
            <p className="text-sm text-slate-500">{visit.lead?.phone}</p>
          </div>
          <Badge tone={tone.badge}>{humanize(visit.status)}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Project" value={visit.project?.name} />
          <InfoRow label="Sales exec" value={visit.exec?.name} />
          <InfoRow label="Scheduled at" value={new Date(visit.scheduledAt).toLocaleString()} />
          <InfoRow label="Type" value={humanize(visit.type)} />
          {visit.pickupRequired && <InfoRow label="Pickup" value={visit.pickupAddress || "Requested"} />}
          {visit.driver?.name && <InfoRow label="Driver" value={visit.driver.name} />}
          {visit.checkedInAt && <InfoRow label="Checked in" value={new Date(visit.checkedInAt).toLocaleString()} />}
          {visit.notes && <InfoRow label="Notes" value={visit.notes} />}
        </div>

        {visit.outcome && (
          <Card className="p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Outcome</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{humanize(visit.outcome.result)} · Budget fit: {humanize(visit.outcome.budgetFit)}</p>
            <p className="mt-1 text-sm text-slate-600">Next step: {visit.outcome.nextStep}</p>
            <p className="text-xs text-slate-500">Follow up: {new Date(visit.outcome.nextFollowUpAt).toLocaleString()}</p>
          </Card>
        )}

        {mode === "reschedule" && (
          <div className="space-y-2 rounded-md border border-slate-200 p-3">
            <label className="text-sm font-medium text-slate-700">New date and time</label>
            <Input type="datetime-local" value={rescheduleAt} onChange={(e) => setRescheduleAt(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setMode(null)}>Back</Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => run(() => api.patch(`/site-visits/${visit.id}/reschedule`, { scheduledAt: new Date(rescheduleAt).toISOString() }), "Visit rescheduled.")}
              >
                Confirm reschedule
              </Button>
            </div>
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-2 rounded-md border border-slate-200 p-3">
            <label className="text-sm font-medium text-slate-700">Cancellation reason</label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Optional" />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setMode(null)}>Back</Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => run(() => api.patch(`/site-visits/${visit.id}/cancel`, { cancelReason }), "Visit cancelled.")}
              >
                Confirm cancel
              </Button>
            </div>
          </div>
        )}

        {mode === "outcome" && (
          <div className="space-y-2 rounded-md border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Result">
                <Select value={outcome.result} onChange={(e) => setOutcome((c) => ({ ...c, result: e.target.value }))}>
                  {VISIT_RESULTS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
                </Select>
              </Field>
              <Field label="Budget fit">
                <Select value={outcome.budgetFit} onChange={(e) => setOutcome((c) => ({ ...c, budgetFit: e.target.value }))}>
                  {BUDGET_FITS.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Next step">
              <Input value={outcome.nextStep} onChange={(e) => setOutcome((c) => ({ ...c, nextStep: e.target.value }))} placeholder="e.g. Send cost sheet" />
            </Field>
            <Field label="Next follow-up">
              <Input type="datetime-local" value={outcome.nextFollowUpAt} onChange={(e) => setOutcome((c) => ({ ...c, nextFollowUpAt: e.target.value }))} />
            </Field>
            <Field label="Notes">
              <Input value={outcome.notes} onChange={(e) => setOutcome((c) => ({ ...c, notes: e.target.value }))} placeholder="Optional" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setMode(null)}>Back</Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !outcome.nextStep}
                onClick={() => run(() => api.post(`/site-visits/${visit.id}/outcome`, {
                  result: outcome.result,
                  budgetFit: outcome.budgetFit,
                  nextStep: outcome.nextStep,
                  nextFollowUpAt: new Date(outcome.nextFollowUpAt).toISOString(),
                  notes: outcome.notes || undefined,
                }), "Outcome saved.")}
              >
                Save outcome
              </Button>
            </div>
          </div>
        )}

        {!mode && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canCancel && (
                <Button type="button" variant="outlineDestructive" size="sm" disabled={busy} onClick={() => setMode("cancel")}>
                  Cancel visit
                </Button>
              )}
              {canMarkNoShow && (
                <Button
                  type="button"
                  variant="outlineDestructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => run(() => api.patch(`/site-visits/${visit.id}/no-show`, {}), "Marked as no-show.")}
                >
                  No-show
                </Button>
              )}
              {canReschedule && (
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => setMode("reschedule")}>
                  Reschedule
                </Button>
              )}
              {canConfirm && (
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run(() => api.patch(`/site-visits/${visit.id}/confirm`), "Visit confirmed.")}>
                  Confirm
                </Button>
              )}
              {canCheckIn && (
                <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run(() => api.patch(`/site-visits/${visit.id}/check-in`, {}), "Checked in.")}>
                  Check in
                </Button>
              )}
              {canRecordOutcome && (
                <Button type="button" size="sm" disabled={busy} onClick={() => setMode("outcome")}>
                  Record outcome
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}
