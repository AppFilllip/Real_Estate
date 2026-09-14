import { ArrowRight, Check, Download, Eye, KeyRound, MessageCircle, Pencil, PhoneCall, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { Switch } from "../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { cn, money } from "../../lib/utils";
import { sectionResources } from "../../lib/routes";
import { Screen } from "../dashboard/dashboard-screen";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { api } from "../../services/api";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { canCreateRecord, canDeleteRecord, canEditRecord, RecordDialog } from "./record-dialog";

const SETTINGS_TITLES = new Set(["Users", "Roles", "Teams", "Workspaces"]);

export function DataScreen({ title, endpoint, columns, navigate, routeKey, compact = false, initialSearch = "", user = null }) {
  const [dialog, setDialog] = useState({ open: false, mode: "create", record: null });
  const [passwordDialog, setPasswordDialog] = useState({ open: false, record: null, value: "", saving: false });
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState("table");
  const [page, setPage] = useState(0);
  const take = 10;
  const tabs = tabsFor(title, user);
  const activeTabDef = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const params = {
    take,
    skip: page * take,
    ...(search ? { search } : {}),
    ...(tabs.length ? activeTabDef?.params || {} : statusFilter ? { [filterKeyFor(title)]: statusFilter } : {}),
  };
  const [response, , loading, error, reload] = useApiData(endpoint, { data: [] }, params, { enabled: view === "table" });
  const [counts, , countsLoading] = useApiData(`${endpoint}/counts`, {}, {}, { enabled: tabs.length > 0 });
  const rows = Array.isArray(response) ? response : response.data || response.items || [];

  const kanbanParams = {
    take: 500,
    ...(search ? { search } : {}),
    ...(tabs.length ? activeTabDef?.params || {} : {}),
  };
  const [kanbanResponse, , kanbanLoading] = useApiData(
    endpoint,
    { data: [] },
    kanbanParams,
    { enabled: tabs.length > 0 && view === "kanban" }
  );
  const kanbanRows = Array.isArray(kanbanResponse) ? kanbanResponse : kanbanResponse.data || [];
  const createEnabled = canCreateRecord(title);
  const editEnabled = canEditRecord(title);
  const deleteEnabled = canDeleteRecord(title);

  useEffect(() => {
    setSearch(initialSearch);
    setPage(0);
  }, [initialSearch]);

  function openCreate() {
    setDialog({ open: true, mode: "create", record: null });
  }

  function openEdit(record) {
    setDialog({ open: true, mode: "edit", record });
  }

  function openDetail(record) {
    if (!navigate || !routeKey || !record.id) return;
    const basePath = routeKey === "receipts" ? "/collections/receipts" : `/${routeKey}`;
    navigate(`${basePath}/${record.id}`);
  }

  async function removeRecord(record) {
    if (!deleteEnabled || !record.id) return;
    try {
      await api.delete(`${endpoint}/${record.id}`);
      reload();
      toast.success("Record deleted");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Could not delete record.");
    }
  }

  async function runWorkflow(path, payload = {}) {
    try {
      await api.patch(path, payload);
      reload();
      toast.success("Workflow updated");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Workflow action failed.");
    }
  }

  function openSetPassword(record) {
    setPasswordDialog({ open: true, record, value: generatePassword(), saving: false });
  }

  function closeSetPassword() {
    setPasswordDialog({ open: false, record: null, value: "", saving: false });
  }

  async function submitSetPassword() {
    if (!passwordDialog.record) return;
    if (passwordDialog.value.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setPasswordDialog((state) => ({ ...state, saving: true }));
    try {
      await api.patch(`${endpoint}/${passwordDialog.record.id}/set-password`, { password: passwordDialog.value });
      closeSetPassword();
      reload();
      toast.success("Password set — they can log in now.");
    } catch (err) {
      setPasswordDialog((state) => ({ ...state, saving: false }));
      toast.error(err.response?.data?.error?.message || "Could not set password.");
    }
  }

  function showUnavailable(label) {
    toast.error(`${label} integration is not connected yet.`);
  }

  function exportRows() {
    if (!rows.length) {
      toast.error("No rows available to export.");
      return;
    }
    const csv = toCsv(rows, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const content = (
    <>
      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-[#E2E5EA]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(0);
              }}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key ? "border-blue-600 text-blue-600" : "border-transparent text-[#5B6472] hover:text-[#101418]"
              )}
            >
              {tab.label}
              <span className="rounded-full bg-[#EEF0F3] px-1.5 text-xs text-[#5B6472]">
                {countsLoading ? "…" : counts?.[tab.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
        {tabs.length === 0 && filterOptionsFor(title).length > 0 && (
          <Select
            className="w-full max-w-xs"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            {filterOptionsFor(title).map((option) => (
              <option key={option} value={option}>
                {humanize(option)}
              </option>
            ))}
          </Select>
        )}
        <div className="flex items-center gap-2">
          {tabs.length > 0 && (
            <div className="flex rounded-md border border-[#E2E5EA] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn("rounded px-2.5 py-1 text-xs font-semibold", view === "table" ? "bg-[#2E5BFF] text-white" : "text-[#5B6472]")}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={cn("rounded px-2.5 py-1 text-xs font-semibold", view === "kanban" ? "bg-[#2E5BFF] text-white" : "text-[#5B6472]")}
              >
                Kanban
              </button>
            </div>
          )}
          <Button size="sm" disabled={!createEnabled} onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
          <Button variant="secondary" size="sm" onClick={exportRows}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="secondary" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      {view === "kanban" ? (
        <LeadsKanban rows={kanbanRows} loading={kanbanLoading} onOpen={openDetail} />
      ) : (
      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{columnLabel(column)}</TableHead>
                ))}
                <TableHead className="w-[220px] min-w-[220px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <LoadingRows colSpan={columns.length + 1} />
              )}
              {!loading && error && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-32 text-center text-slate-500">
                    {error}
                  </TableCell>
                </TableRow>
              )}
              {!loading && !error && !rows.length && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="h-44 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="text-sm font-medium text-slate-900">No records found</p>
                      <p className="mt-1 text-sm text-slate-500">Create one or change the current filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                !error &&
                rows.map((row, index) => (
                  <TableRow key={row.id || index}>
                    {columns.map((column) => (
                      <TableCell key={column}>{formatTableCell(column, getValue(row, column))}</TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex flex-nowrap items-center justify-end gap-1">
                        {!SETTINGS_TITLES.has(title) && (
                          <Button variant="ghost" size="icon" onClick={() => openDetail(row)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <WorkflowActions title={title} row={row} endpoint={endpoint} onRun={runWorkflow} onUnavailable={showUnavailable} onSetPassword={openSetPassword} />
                        <Button variant="ghost" size="icon" disabled={!editEnabled} onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={!deleteEnabled} onClick={() => removeRecord(row)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      )}
      {view === "table" && (
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Page {page + 1}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={rows.length < take} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      </div>
      )}
      <RecordDialog
        title={title}
        mode={dialog.mode}
        record={dialog.record}
        open={dialog.open}
        onClose={() => setDialog({ open: false, mode: "create", record: null })}
        onSaved={reload}
      />
      <Dialog
        open={passwordDialog.open}
        title={`Set password for ${passwordDialog.record?.name || "team member"}`}
        description="They can use this password to log in right away. Share it with them however you like."
        onClose={closeSetPassword}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={passwordDialog.value}
              onChange={(event) => setPasswordDialog((state) => ({ ...state, value: event.target.value }))}
              className="font-mono-ui"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPasswordDialog((state) => ({ ...state, value: generatePassword() }))}
            >
              Generate
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeSetPassword}>
              Cancel
            </Button>
            <Button disabled={passwordDialog.saving} onClick={submitSetPassword}>
              {passwordDialog.saving ? "Saving…" : "Set password"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );

  if (compact) return <div className="space-y-4">{content}</div>;

  return (
    <Screen title={title} description={`Manage ${title.toLowerCase()} records from the CRM backend.`}>
      {content}
    </Screen>
  );
}

const KANBAN_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION", "TOKEN", "BOOKED"];
const TEMP_DOT = { HOT: "#DC2626", WARM: "#D97706", COLD: "#64748B" };

function daysAgo(value) {
  if (!value) return "";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  return days <= 0 ? "today" : `${days}d`;
}

function LeadsKanban({ rows, loading, onOpen }) {
  const byStage = new Map(KANBAN_STAGES.map((stage) => [stage, []]));
  for (const row of rows) {
    if (byStage.has(row.stage)) byStage.get(row.stage).push(row);
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-[10px]" />;

  return (
    <div className="flex gap-3 overflow-auto pb-2">
      {KANBAN_STAGES.map((stage) => {
        const cards = byStage.get(stage) || [];
        return (
          <div key={stage} className="w-[264px] flex-none rounded-[10px] bg-[#EEF0F3] p-2.5">
            <div className="mb-2 flex items-center justify-between text-[12.5px] font-bold uppercase tracking-wide text-[#5B6472]">
              <span>{humanize(stage)}</span>
              <span className="font-mono-ui text-[11px]">{cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {cards.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => onOpen(lead)}
                  className="rounded-lg border border-[#E2E5EA] bg-white p-2.5 text-left hover:border-[#2E5BFF]"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: TEMP_DOT[lead.temperature] || "#64748B" }} />
                    <span className="text-[13px] font-semibold">{lead.name}</span>
                  </div>
                  <div className="text-[11.5px] text-[#5B6472]">{lead.project?.name || lead.city || "-"}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E8EDFF] text-[9.5px] font-bold text-[#2E5BFF]">
                      {(lead.owner?.name || "-").slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-mono-ui text-[10.5px] text-[#8B93A1]">{daysAgo(lead.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LoadingRows({ colSpan }) {
  return Array.from({ length: 6 }).map((_, index) => (
    <TableRow key={index}>
      <TableCell colSpan={colSpan}>
        <Skeleton className="h-5 w-full" />
      </TableCell>
    </TableRow>
  ));
}

function WorkflowActions({ title, row, endpoint, onRun, onUnavailable, onSetPassword }) {
  if (!row?.id) return null;

  if (title === "Users") {
    return (
      <RowAction title="Set a login password for this team member" onClick={() => onSetPassword(row)}>
        <KeyRound className="h-3.5 w-3.5" />
        Set password
      </RowAction>
    );
  }

  if (title === "Leads") {
    const nextStage = nextLeadStage(row.stage);
    return (
      <>
        <RowAction title="Call lead" className="w-8 px-0" onClick={() => onUnavailable("Call")}>
          <PhoneCall className="h-3.5 w-3.5" />
        </RowAction>
        <RowAction title="Open WhatsApp" className="w-8 px-0" onClick={() => sendWhatsAppMessage({ leadId: row.id, label: row.name })}>
          <MessageCircle className="h-3.5 w-3.5" />
        </RowAction>
        <RowAction
          title={nextStage ? `Move lead to ${humanize(nextStage)}` : "Lead has no next stage"}
          disabled={!nextStage}
          className="w-8 px-0"
          onClick={() => onRun(`${endpoint}/${row.id}/stage`, { stage: nextStage })}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </RowAction>
      </>
    );
  }

  if (title === "Inventory") {
    const nextStatus = nextUnitStatus(row.status);
    const label = unitActionLabel(row.status);
    return (
      <RowAction
        title={nextStatus ? `Move unit to ${humanize(nextStatus)}` : "Unit has no next status"}
        disabled={!nextStatus}
        onClick={() => onRun(`${endpoint}/${row.id}/status`, { status: nextStatus })}
      >
        <ArrowRight className="h-3.5 w-3.5" />
        {label}
      </RowAction>
    );
  }

  if (title === "Bookings") {
    return (
      <>
        {row.status === "DRAFT" && (
          <RowAction title="Submit booking for approval" onClick={() => onRun(`${endpoint}/${row.id}/submit`)}>
            Submit
          </RowAction>
        )}
        {row.status === "PENDING_APPROVAL" && (
          <RowAction title="Approve booking" onClick={() => onRun(`${endpoint}/${row.id}/approve`)}>
            <Check className="h-3.5 w-3.5" />
            Approve
          </RowAction>
        )}
        {!["CANCELLED", "POSSESSION"].includes(row.status) && (
          <RowAction variant="ghost" title="Cancel booking" onClick={() => onRun(`${endpoint}/${row.id}/cancel`, { cancelReason: "Cancelled from CRM" })}>
            <X className="h-3.5 w-3.5" />
            Cancel
          </RowAction>
        )}
      </>
    );
  }

  if (title === "Brokers") {
    const action = row.status === "ACTIVE" ? "suspend" : "activate";
    return (
      <RowAction title={`${humanize(action)} broker`} onClick={() => onRun(`${endpoint}/${row.id}/${action}`)}>
        {action === "activate" ? "Activate" : "Suspend"}
      </RowAction>
    );
  }

  if (title === "Tasks" && row.status !== "DONE") {
    return (
      <RowAction title="Mark task done" onClick={() => onRun(`${endpoint}/${row.id}/done`, { dispositionNote: "Completed from CRM" })}>
        <Check className="h-3.5 w-3.5" />
        Done
      </RowAction>
    );
  }

  return null;
}

function RowAction({ children, className = "", ...props }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className={`h-8 gap-1 rounded-md px-2.5 text-xs font-medium shadow-none ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

function nextLeadStage(stage) {
  const stages = ["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION"];
  const index = stages.indexOf(stage || "NEW");
  return index >= 0 ? stages[index + 1] : null;
}

function nextUnitStatus(status) {
  const transitions = {
    AVAILABLE: "ON_HOLD",
    ON_HOLD: "AVAILABLE",
    BLOCKED: "AVAILABLE",
    BOOKED: "AGREEMENT",
    AGREEMENT: "REGISTERED",
    REGISTERED: "POSSESSION",
    NOT_FOR_SALE: "AVAILABLE",
  };
  return transitions[status] || null;
}

function unitActionLabel(status) {
  return {
    AVAILABLE: "Hold",
    ON_HOLD: "Release",
    BLOCKED: "Release",
    BOOKED: "Agreement",
    AGREEMENT: "Register",
    REGISTERED: "Possession",
    NOT_FOR_SALE: "Release",
  }[status] || "Next";
}

const settingsTabs = [
  { key: "users", label: "Team Members", title: "Users", endpoint: "/users", columns: ["name", "email", "phone", "status", "roleId"] },
  { key: "roles", label: "Roles", title: "Roles", endpoint: "/roles", columns: ["name", "code", "isSystem", "createdAt"] },
  { key: "permissions", label: "Permissions" },
  { key: "workspaces", label: "Workspaces", title: "Workspaces", endpoint: "/companies", columns: ["name", "shortCode", "legalName", "gstin"] },
  { key: "whatsapp", label: "WhatsApp" },
];

export function SettingsScreen({ navigate }) {
  const [activeTab, setActiveTab] = useState("users");
  const selected = settingsTabs.find((tab) => tab.key === activeTab) || settingsTabs[0];

  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <div className="mb-0.5 text-xs text-[#8B93A1]">EstateOS / Settings</div>
        <h1 className="font-display m-0 text-2xl font-semibold leading-8 tracking-normal text-[#101418]">Settings</h1>
        <p className="mt-0.5 text-[13px] text-[#5B6472]">Manage workspaces, team members, roles, and access control.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {settingsTabs.map((tab) => (
          <Button key={tab.key} variant={activeTab === tab.key ? "default" : "secondary"} size="sm" onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>
      {selected.key === "permissions" ? (
        <PermissionsMatrix />
      ) : selected.key === "whatsapp" ? (
        <WhatsAppStatusCard />
      ) : (
        <DataScreen title={selected.title} endpoint={selected.endpoint} columns={selected.columns} navigate={navigate} routeKey={selected.key} compact />
      )}
    </section>
  );
}

/**
 * Read-only status — credentials live in backend env vars (WHATSAPP_API_URL/
 * SESSION_ID/TOKEN), not editable here. The gateway token expires roughly
 * every 7 days and needs a redeploy with a fresh WHATSAPP_TOKEN.
 */
function WhatsAppStatusCard() {
  const [response, , loading] = useApiData("/whatsapp/status", null);
  const status = response?.data;

  if (loading) return <Skeleton className="h-32 w-full rounded-[10px]" />;

  return (
    <Card className="max-w-md space-y-3 p-4.5">
      <div className="flex items-center justify-between">
        <h3 className="m-0 text-base font-semibold">WhatsApp gateway</h3>
        <Badge tone={status?.configured ? "green" : "slate"}>{status?.configured ? "Connected" : "Not connected"}</Badge>
      </div>
      <p className="text-[13px] text-[#5B6472]">
        Credentials are set via <code>WHATSAPP_API_URL</code>, <code>WHATSAPP_SESSION_ID</code>, and{" "}
        <code>WHATSAPP_TOKEN</code> environment variables on the backend.
      </p>
      {status?.tokenExpiresAt && (
        <p className="text-[13px] text-[#5B6472]">
          Token {status.tokenExpired ? "expired" : "expires"}: {new Date(status.tokenExpiresAt).toLocaleString()}
        </p>
      )}
    </Card>
  );
}

const SECTION_ENTRIES = Object.entries(sectionResources);

function PermissionsMatrix() {
  const [response, , loading, , reload] = useApiData("/roles", { data: [] }, { take: 50 });
  const roles = Array.isArray(response) ? response : response.data || [];
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roles.length) return;
    if (roles.some((role) => role.id === selectedRoleId)) return;
    const firstEditable = roles.find((role) => role.code !== "SUPER_ADMIN") || roles[0];
    setSelectedRoleId(firstEditable.id);
  }, [roles, selectedRoleId]);

  if (loading) return <Skeleton className="h-64 w-full rounded-[10px]" />;

  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.code === "SUPER_ADMIN";
  const original = selectedRole?.permissionsJson || {};
  const draft = drafts[selectedRoleId] || original;
  const dirty = drafts[selectedRoleId] != null && JSON.stringify(draft) !== JSON.stringify(original);

  function updateSection(resourceList, letter, enabled) {
    setDrafts((state) => {
      const base = state[selectedRoleId] || original;
      const next = { ...base };
      for (const resource of resourceList) {
        next[resource] = setAction(base[resource], letter, enabled);
      }
      return { ...state, [selectedRoleId]: next };
    });
  }

  function discardChanges() {
    setDrafts((state) => {
      const next = { ...state };
      delete next[selectedRoleId];
      return next;
    });
  }

  async function saveChanges() {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await api.patch(`/roles/${selectedRole.id}`, { permissionsJson: draft });
      toast.success(`Updated permissions for ${selectedRole.name}.`);
      discardChanges();
      reload();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b border-[#E2E5EA]">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRoleId(role.id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              selectedRoleId === role.id ? "border-blue-600 text-blue-600" : "border-transparent text-[#5B6472] hover:text-[#101418]"
            )}
          >
            {role.name}
            {drafts[role.id] != null && <span className="h-1.5 w-1.5 rounded-full bg-[#2E5BFF]" />}
          </button>
        ))}
      </div>

      {isSuperAdmin ? (
        <Card className="p-5 text-sm text-[#5B6472]">
          Super Admins automatically have full access to every section across every workspace. Access for this role can't be restricted here.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-[#EEF0F3] px-4 py-2.5">
            <div className="grid grid-cols-[1fr_repeat(3,72px)] items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#5B6472] sm:grid-cols-[1fr_repeat(3,88px)]">
              <span>CRM section</span>
              <span className="text-center">View</span>
              <span className="text-center">Edit</span>
              <span className="text-center">Delete</span>
            </div>
          </div>
          <div className="divide-y divide-[#EEF0F3]">
            {SECTION_ENTRIES.map(([sectionKey, section]) => {
              const hasLetter = (letter) => section.resources.some((resource) => (draft[resource] || []).includes(letter));
              return (
                <div
                  key={sectionKey}
                  className="grid grid-cols-[1fr_repeat(3,72px)] items-center gap-2 px-4 py-2.5 sm:grid-cols-[1fr_repeat(3,88px)]"
                >
                  <span className="text-[13px] font-semibold text-[#101418]">{section.label}</span>
                  <span className="flex justify-center">
                    <Switch checked={hasLetter("R")} onCheckedChange={(checked) => updateSection(section.resources, "R", checked)} />
                  </span>
                  <span className="flex justify-center">
                    <Switch
                      checked={hasLetter("C") || hasLetter("U")}
                      onCheckedChange={(checked) => {
                        updateSection(section.resources, "C", checked);
                        updateSection(section.resources, "U", checked);
                      }}
                    />
                  </span>
                  <span className="flex justify-center">
                    <Switch checked={hasLetter("D")} onCheckedChange={(checked) => updateSection(section.resources, "D", checked)} />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#EEF0F3] bg-[#FAFBFC] px-4 py-3">
            {dirty && (
              <Button variant="secondary" size="sm" onClick={discardChanges} disabled={saving}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={saveChanges} disabled={!dirty || saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function setAction(grants, letter, enabled) {
  const set = new Set(grants || []);
  if (enabled) set.add(letter);
  else set.delete(letter);
  return Array.from(set);
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  if (String(value).length > 36) return `${String(value).slice(0, 36)}...`;
  return String(value);
}

function formatTableCell(column, value) {
  if (["status", "stage", "temperature", "tier", "mode"].includes(column) && value) {
    return <Badge tone={toneFor(value)}>{humanize(formatCell(value))}</Badge>;
  }
  if (["lastActivityAt", "nextFollowUpAt"].includes(column)) {
    return formatDateTime(value);
  }
  if (String(column).toLowerCase().includes("amount") || String(column).toLowerCase().includes("value")) {
    return money(value);
  }
  return formatCell(value);
}

function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvValue(columnLabel(column))).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(rawCsvValue(getValue(row, column)))).join(","))
    .join("\n");
  return [header, body].filter(Boolean).join("\n");
}

function getValue(row, column) {
  return column.split(".").reduce((value, key) => (value == null ? value : value[key]), row);
}

const columnLabelOverrides = {
  "project.name": "Project Interest",
  "source.name": "Source",
  "owner.name": "Owner",
  lastActivityAt: "Last Activity",
  nextFollowUpAt: "Next Follow-up",
};

function columnLabel(column) {
  return columnLabelOverrides[column] || humanize(column.split(".").pop());
}

function tabsFor(title, user) {
  if (title !== "Leads") return [];
  return [
    { key: "all", label: "All", params: {} },
    { key: "mine", label: "My leads", params: { ownerId: user?.id } },
    { key: "unassigned", label: "Unassigned", params: { unassigned: true } },
    { key: "newToday", label: "New today", params: { newToday: true } },
    { key: "followUpDue", label: "Follow-up due", params: { followUpDue: true } },
    { key: "hot", label: "Hot", params: { temperature: "HOT" } },
    { key: "visitScheduled", label: "Visit scheduled", params: { stage: "VISIT_SCHEDULED" } },
    { key: "negotiation", label: "Negotiation", params: { stage: "NEGOTIATION" } },
    { key: "brokerLeads", label: "Broker leads", params: { hasBroker: true } },
  ];
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function rawCsvValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function filterKeyFor(title) {
  return title === "Leads" ? "stage" : "status";
}

function filterOptionsFor(title) {
  return {
    Leads: ["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION", "TOKEN", "BOOKED", "LOST"],
    Projects: ["DRAFT", "UPCOMING", "LAUNCHED", "SELLING", "SOLD_OUT", "ON_HOLD", "CLOSED"],
    Inventory: ["AVAILABLE", "ON_HOLD", "BLOCKED", "BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION", "NOT_FOR_SALE"],
    Bookings: ["DRAFT", "PENDING_APPROVAL", "BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION", "CANCELLED"],
    Receipts: ["RECORDED", "PENDING_CLEARANCE", "CLEARED", "BOUNCED"],
    Brokers: ["PENDING", "ACTIVE", "SUSPENDED"],
    Tasks: ["OPEN", "SNOOZED", "DONE", "CANCELLED"],
  }[title] || [];
}

function toneFor(value) {
  const normalized = String(value).toUpperCase();
  if (["ACTIVE", "AVAILABLE", "BOOKED", "DONE", "CLEARED", "HOT", "SELLING", "QUALIFIED"].includes(normalized)) return "green";
  if (["PENDING", "PENDING_APPROVAL", "ON_HOLD", "SNOOZED", "WARM", "CONTACTED", "VISIT_SCHEDULED"].includes(normalized)) return "amber";
  if (["NEW", "DRAFT", "UPCOMING", "RECORDED", "COLD"].includes(normalized)) return "blue";
  if (["CANCELLED", "SUSPENDED", "LOST", "BOUNCED", "BLOCKED", "NOT_FOR_SALE"].includes(normalized)) return "red";
  if (["NEGOTIATION", "TOKEN", "VISIT_DONE", "AGREEMENT", "REGISTERED", "POSSESSION"].includes(normalized)) return "violet";
  return "slate";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let value = "";
  for (let i = 0; i < 12; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

function humanize(value) {
  return String(value).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
