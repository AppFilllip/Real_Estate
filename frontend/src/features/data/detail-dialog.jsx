import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { api } from "../../services/api";
import { money } from "../../lib/utils";

const readableFields = {
  Leads: ["name", "phone", "email", "stage", "temperature", "city", "score", "nextFollowUpAt"],
  Projects: ["name", "shortCode", "ownershipType", "type", "status", "city", "state", "reraNumber"],
  Inventory: ["unitCode", "number", "status", "area", "areaUnit", "facing", "roadWidthFt", "availableSince"],
  Bookings: ["bookingNumber", "status", "agreementValue", "discountAmount", "fundingType", "bookedOn"],
  Customers: ["name", "phone", "email", "portalAccessEnabled", "relationshipManagerId", "panLast4"],
  Receipts: ["receiptNumber", "amount", "mode", "status", "receivedOn", "transactionRef", "bankName"],
  Brokers: ["contactPerson", "phone", "firmName", "email", "tier", "status", "reraAgentNo", "gstNumber"],
  Marketing: ["name", "channel", "budget", "spend", "startDate", "endDate", "landingPageUrl"],
  "Calls & IVR": ["direction", "status", "fromNumber", "toNumber", "agentId", "startedAt", "talkSeconds", "disposition"],
  Inbox: ["channel", "status", "contactValue", "assigneeId", "unreadCount", "lastMessageAt", "firstResponseDueAt"],
  Tasks: ["title", "type", "status", "dueAt", "assigneeId", "leadId", "bookingId"],
  Users: ["name", "email", "phone", "status", "roleId", "teamId", "managerId", "dailyLeadCap"],
  Roles: ["name", "code", "isSystem", "permissionsJson", "createdAt"],
  Workspaces: ["name", "shortCode", "legalName", "gstin", "pan", "reraPromoterNo"],
};

const fetchableDetails = new Set([
  "Leads",
  "Projects",
  "Inventory",
  "Customers",
  "Brokers",
  "Marketing",
  "Calls & IVR",
  "Inbox",
  "Tasks",
  "Users",
  "Roles",
  "Workspaces",
]);

export function DetailDialog({ title, endpoint, row, open, onClose, onChanged }) {
  const [detail, setDetail] = useState(row);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !row?.id) return;
    setDetail(row);
    setError("");

    if (!fetchableDetails.has(title)) return;
    let active = true;
    setLoading(true);
    api
      .get(`${endpoint}/${row.id}`)
      .then((response) => {
        if (active) setDetail(response.data.data);
      })
      .catch(() => {
        if (active) setDetail(row);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [endpoint, open, row, title]);

  if (!row) return null;

  return (
    <Dialog open={open} title={`${title} detail`} description={primaryLabel(title, detail)} onClose={onClose} className="max-w-5xl">
      <DetailContent title={title} detail={detail} loading={loading} error={error} onError={setError} onChanged={onChanged} compact />
    </Dialog>
  );
}

export function DetailContent({ title, detail, loading, error, onError, onChanged, compact = false }) {
  return (
    <div className={`${compact ? "max-h-[75vh] overflow-auto pr-1" : ""} space-y-4`}>
      {loading && <p className="text-sm text-slate-500">Loading detail...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(readableFields[title] || Object.keys(detail || {}).slice(0, 8)).map((field) => (
          <FieldValue key={field} label={field} value={detail?.[field]} />
        ))}
      </div>
      {title === "Leads" && <LeadDetail lead={detail} onError={onError} onChanged={onChanged} />}
    </div>
  );
}

function LeadDetail({ lead, onError, onChanged }) {
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [noteBody, setNoteBody] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lead?.id) return;
    loadRelated();
  }, [lead?.id]);

  async function loadRelated() {
    setLoading(true);
    onError("");
    try {
      const [timelineResponse, notesResponse, tasksResponse] = await Promise.all([
        api.get(`/leads/${lead.id}/timeline`),
        api.get(`/leads/${lead.id}/notes`),
        api.get(`/leads/${lead.id}/tasks`),
      ]);
      setTimeline(timelineResponse.data.data || []);
      setNotes(notesResponse.data.data || []);
      setTasks(tasksResponse.data.data || []);
    } catch (err) {
      onError(err.response?.data?.error?.message || err.response?.data?.message || "Could not load lead activity.");
    } finally {
      setLoading(false);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    if (!noteBody.trim()) return;
    try {
      await api.post(`/leads/${lead.id}/notes`, { body: noteBody.trim() });
      setNoteBody("");
      await loadRelated();
      onChanged();
    } catch (err) {
      onError(err.response?.data?.error?.message || err.response?.data?.message || "Could not add note.");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-4 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-950">Timeline</h3>
          {loading && <span className="text-xs text-slate-500">Refreshing...</span>}
        </div>
        <div className="space-y-3">
          {timeline.length === 0 && <p className="text-sm text-slate-500">No timeline events yet.</p>}
          {timeline.slice(0, 8).map((item) => (
            <div key={item.id} className="border-l-2 border-slate-200 pl-3">
              <p className="text-sm font-medium text-slate-900">{item.summary || item.type}</p>
              <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-950">Notes</h3>
        <form className="mb-3 flex gap-2" onSubmit={addNote}>
          <Input value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Add note" />
          <Button type="submit" size="sm">Add</Button>
        </form>
        <div className="space-y-2">
          {notes.length === 0 && <p className="text-sm text-slate-500">No notes yet.</p>}
          {notes.slice(0, 5).map((note) => (
            <div key={note.id} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm text-slate-800">{note.body}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(note.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 lg:col-span-3">
        <h3 className="mb-3 text-sm font-semibold text-slate-950">Tasks</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks for this lead.</p>}
          {tasks.slice(0, 6).map((task) => (
            <div key={task.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{task.title || task.type}</p>
                <Badge>{task.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">{formatDate(task.dueAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function FieldValue({ label, value }) {
  return (
    <Card className="p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{humanize(label)}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{formatValue(label, value)}</p>
    </Card>
  );
}

function formatValue(label, value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  if (label.toLowerCase().includes("amount") || label.toLowerCase().includes("value")) return money(value);
  if (String(label).toLowerCase().includes("at") || String(label).toLowerCase().includes("on") || String(label).toLowerCase().includes("since")) {
    return formatDate(value);
  }
  return String(value);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function humanize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function primaryLabel(title, row) {
  if (!row) return "";
  if (title === "Inventory") return row.unitCode || row.number || "";
  if (title === "Bookings") return row.bookingNumber || "";
  if (title === "Receipts") return row.receiptNumber || "";
  if (title === "Brokers") return row.contactPerson || row.firmName || "";
  if (title === "Calls & IVR") return `${row.fromNumber || ""} -> ${row.toNumber || ""}`.trim();
  if (title === "Inbox") return row.contactValue || "";
  return row.name || row.title || row.id || "";
}
