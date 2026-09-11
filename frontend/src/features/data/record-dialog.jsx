import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";

const configs = {
  Leads: {
    endpoint: "/leads",
    singular: "Lead",
    canEdit: true,
    canDelete: false,
    description: "Capture buyer details and pipeline stage.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "city", label: "City" },
      { name: "source", label: "Source" },
      { name: "ownerId", label: "Owner", type: "reference", endpoint: "/users", optionLabel: "name" },
      { name: "stage", label: "Stage", type: "select", options: ["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION", "TOKEN", "BOOKED", "LOST", "UNQUALIFIED"] },
    ],
  },
  Projects: {
    endpoint: "/projects",
    singular: "Project",
    canEdit: true,
    canDelete: true,
    description: "Manage project identity, launch state, and location.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "shortCode", label: "Short code", required: true },
      { name: "ownershipType", label: "Ownership", type: "select", required: true, options: ["OWN", "PARTNER"] },
      { name: "type", label: "Type", type: "select", required: true, options: ["PLOTS", "VILLAS", "APARTMENTS", "COMMERCIAL", "FARMHOUSE"] },
      { name: "status", label: "Status", type: "select", options: ["DRAFT", "UPCOMING", "LAUNCHED", "SELLING", "SOLD_OUT", "ON_HOLD", "CLOSED"] },
      { name: "developerName", label: "Developer" },
      { name: "city", label: "City" },
      { name: "state", label: "State" },
      { name: "pincode", label: "Pincode" },
      { name: "reraNumber", label: "RERA number" },
    ],
  },
  Inventory: {
    endpoint: "/units",
    singular: "Unit",
    canEdit: true,
    canDelete: false,
    description: "Create or update sellable inventory units.",
    fields: [
      { name: "projectId", label: "Project", type: "reference", endpoint: "/projects", optionLabel: "name", required: true },
      { name: "blockId", label: "Block", type: "reference", endpoint: "/blocks", optionLabel: "name", required: true },
      { name: "floorId", label: "Floor", type: "reference", endpoint: "/floors", optionLabel: "name" },
      { name: "unitCode", label: "Unit code", required: true },
      { name: "number", label: "Number", required: true },
      { name: "area", label: "Area", type: "number", required: true },
      { name: "areaUnit", label: "Area unit" },
      { name: "facing", label: "Facing", type: "select", options: ["NORTH", "SOUTH", "EAST", "WEST", "NORTH_EAST", "NORTH_WEST", "SOUTH_EAST", "SOUTH_WEST"] },
      { name: "roadWidthFt", label: "Road width", type: "number" },
    ],
  },
  Bookings: {
    endpoint: "/bookings",
    singular: "Booking",
    canEdit: false,
    canDelete: false,
    description: "Create draft bookings from available seeded leads and units.",
    fields: [
      { name: "projectId", label: "Project", type: "reference", endpoint: "/projects", optionLabel: "name", required: true },
      { name: "unitId", label: "Unit", type: "reference", endpoint: "/units", optionLabel: "unitCode", required: true },
      { name: "leadId", label: "Lead", type: "reference", endpoint: "/leads", optionLabel: "name" },
      { name: "customerId", label: "Customer", type: "reference", endpoint: "/customers", optionLabel: "name" },
      { name: "brokerId", label: "Broker", type: "reference", endpoint: "/brokers", optionLabel: "contactPerson" },
      { name: "bookingNumber", label: "Booking number", required: true },
      { name: "agreementValue", label: "Agreement value", type: "number", required: true },
      { name: "discountAmount", label: "Discount", type: "number" },
      { name: "fundingType", label: "Funding", type: "select", options: ["SELF", "HOME_LOAN"] },
      { name: "bankName", label: "Bank" },
    ],
  },
  Receipts: {
    endpoint: "/receipts",
    singular: "Receipt",
    canEdit: false,
    canDelete: false,
    description: "Record incoming customer payment receipts.",
    fields: [
      { name: "bookingId", label: "Booking", type: "reference", endpoint: "/bookings", optionLabel: "bookingNumber", required: true },
      { name: "receiptNumber", label: "Receipt number", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "mode", label: "Mode", type: "select", required: true, options: ["CASH", "UPI", "NEFT_RTGS", "CHEQUE", "CARD", "ONLINE_LINK"] },
      { name: "status", label: "Status", type: "select", options: ["RECORDED", "PENDING_CLEARANCE", "CLEARED", "BOUNCED"] },
      { name: "receivedOn", label: "Received on", type: "date", required: true },
      { name: "transactionRef", label: "Transaction ref" },
      { name: "bankName", label: "Bank" },
      { name: "remarks", label: "Remarks" },
    ],
  },
  Brokers: {
    endpoint: "/brokers",
    singular: "Broker",
    canEdit: true,
    canDelete: true,
    description: "Maintain channel partner profile and portal status.",
    fields: [
      { name: "contactPerson", label: "Contact person", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "firmName", label: "Firm name" },
      { name: "email", label: "Email", type: "email" },
      { name: "reraAgentNo", label: "RERA agent no" },
      { name: "gstNumber", label: "GST number" },
      { name: "tier", label: "Tier", type: "select", options: ["BRONZE", "SILVER", "GOLD"] },
      { name: "status", label: "Status", type: "select", options: ["PENDING", "ACTIVE", "SUSPENDED"] },
    ],
  },
  Tasks: {
    endpoint: "/tasks",
    singular: "Task",
    canEdit: true,
    canDelete: true,
    description: "Create follow-up tasks for leads, bookings, and staff.",
    fields: [
      { name: "title", label: "Title" },
      { name: "type", label: "Type", type: "select", required: true, options: ["CALL", "WHATSAPP", "EMAIL", "SITE_VISIT_PREP", "DOCUMENT", "OTHER"] },
      { name: "status", label: "Status", type: "select", options: ["OPEN", "SNOOZED", "DONE", "CANCELLED"] },
      { name: "assigneeId", label: "Assignee", type: "reference", endpoint: "/users", optionLabel: "name", required: true },
      { name: "leadId", label: "Lead", type: "reference", endpoint: "/leads", optionLabel: "name" },
      { name: "bookingId", label: "Booking", type: "reference", endpoint: "/bookings", optionLabel: "bookingNumber" },
      { name: "dueAt", label: "Due at", type: "datetime-local", required: true },
      { name: "note", label: "Note" },
      { name: "reminderMinutesBefore", label: "Reminder minutes", type: "number" },
    ],
  },
  Marketing: {
    endpoint: "/campaigns",
    singular: "Campaign",
    canEdit: true,
    canDelete: true,
    description: "Create marketing campaigns and track spends.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "channel", label: "Channel", type: "select", required: true, options: ["META", "GOOGLE", "PORTAL", "HOARDING", "NEWSPAPER", "RADIO", "EVENT", "REFERRAL", "IVR_NUMBER"] },
      { name: "projectId", label: "Project", type: "reference", endpoint: "/projects", optionLabel: "name" },
      { name: "budget", label: "Budget", type: "number" },
      { name: "spend", label: "Spend", type: "number" },
      { name: "startDate", label: "Start date", type: "date" },
      { name: "endDate", label: "End date", type: "date" },
      { name: "landingPageUrl", label: "Landing page URL" },
    ],
  },
  "Calls & IVR": {
    endpoint: "/calls",
    singular: "Call",
    canEdit: true,
    canDelete: false,
    description: "Log inbound and outbound call activity.",
    fields: [
      { name: "direction", label: "Direction", type: "select", required: true, options: ["INBOUND", "OUTBOUND"] },
      { name: "status", label: "Status", type: "select", options: ["INITIATED", "RINGING", "CONNECTED", "COMPLETED", "MISSED", "FAILED", "VOICEMAIL"] },
      { name: "fromNumber", label: "From number", required: true },
      { name: "toNumber", label: "To number", required: true },
      { name: "agentId", label: "Agent", type: "reference", endpoint: "/users", optionLabel: "name" },
      { name: "leadId", label: "Lead", type: "reference", endpoint: "/leads", optionLabel: "name" },
      { name: "startedAt", label: "Started at", type: "datetime-local" },
      { name: "dispositionNote", label: "Disposition note" },
    ],
  },
  Inbox: {
    endpoint: "/conversations",
    singular: "Conversation",
    canEdit: true,
    canDelete: false,
    description: "Track WhatsApp, SMS, email, and call conversations.",
    fields: [
      { name: "channel", label: "Channel", type: "select", required: true, options: ["WHATSAPP", "SMS", "EMAIL"] },
      { name: "status", label: "Status", type: "select", options: ["OPEN", "CLOSED"] },
      { name: "contactValue", label: "Contact", required: true },
      { name: "assigneeId", label: "Assignee", type: "reference", endpoint: "/users", optionLabel: "name" },
      { name: "leadId", label: "Lead", type: "reference", endpoint: "/leads", optionLabel: "name" },
      { name: "customerId", label: "Customer", type: "reference", endpoint: "/customers", optionLabel: "name" },
      { name: "unreadCount", label: "Unread count", type: "number" },
      { name: "lastMessageAt", label: "Last message at", type: "datetime-local" },
    ],
  },
  Users: {
    endpoint: "/users",
    singular: "User",
    canEdit: true,
    canDelete: true,
    description: "Add team members and assign CRM roles.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "roleId", label: "Role", type: "reference", endpoint: "/roles", optionLabel: "name", required: true },
      { name: "teamId", label: "Team", type: "reference", endpoint: "/teams", optionLabel: "name" },
      { name: "managerId", label: "Manager", type: "reference", endpoint: "/users", optionLabel: "name" },
      { name: "status", label: "Status", type: "select", options: ["INVITED", "ACTIVE", "SUSPENDED", "LEFT"] },
      { name: "dailyLeadCap", label: "Daily lead cap", type: "number" },
    ],
  },
  Roles: {
    endpoint: "/roles",
    singular: "Role",
    canEdit: true,
    canDelete: true,
    description: "Create a role name and code — manage its access from the Permissions tab.",
    fields: [
      { name: "code", label: "Code", type: "select", required: true, lockOnEdit: true, options: ["SUPER_ADMIN", "DIRECTOR", "SALES_HEAD", "TEAM_LEAD", "SALES_EXEC", "PRESALES", "CRM_EXEC", "ACCOUNTS", "MARKETING", "INVENTORY_ADMIN", "BROKER", "CUSTOMER"] },
      { name: "name", label: "Name", required: true },
    ],
  },
  Workspaces: {
    endpoint: "/companies",
    singular: "Workspace",
    canEdit: true,
    canDelete: false,
    description: "Manage workspace/company records.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "legalName", label: "Legal name" },
      { name: "shortCode", label: "Short code", required: true },
      { name: "gstin", label: "GSTIN" },
      { name: "pan", label: "PAN" },
      { name: "reraPromoterNo", label: "RERA promoter no" },
    ],
  },
};

export function canCreateRecord(title) {
  return Boolean(configs[title]);
}

export function canEditRecord(title) {
  return Boolean(configs[title]?.canEdit);
}

export function canDeleteRecord(title) {
  return Boolean(configs[title]?.canDelete);
}

export function RecordDialog({ title, mode, record, open, onClose, onSaved }) {
  const config = configs[title];
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !config) return;
    if (mode === "edit" && record) {
      setValues(Object.fromEntries(config.fields.map((field) => [field.name, formatInputValue(field, record[field.name])])));
    } else {
      setValues(defaultValues(config));
    }
    setError("");
  }, [open, mode, record, config]);

  if (!config) return null;

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = normalizePayload(values, config.fields);
      if (title === "Roles" && mode === "create") payload.permissionsJson = {};
      if (mode === "edit") {
        await api.patch(`${config.endpoint}/${record.id}`, payload);
      } else {
        await api.post(config.endpoint, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || "Could not save record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={`${mode === "edit" ? "Edit" : "Create"} ${config.singular}`}
      description={config.description}
      onClose={onClose}
      className="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          {config.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name] || ""}
              onChange={setValue}
              disabled={mode === "edit" && field.lockOnEdit}
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function FieldControl({ field, value, onChange, disabled = false }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">
        {field.label}
        {field.required && <span className="text-red-600"> *</span>}
        {disabled && <span className="ml-1 text-xs font-normal text-slate-400">(can't be changed after creation)</span>}
      </label>
      {field.type === "select" && (
        <Select value={value} required={field.required} disabled={disabled} onChange={(event) => onChange(field.name, event.target.value)}>
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      )}
      {field.type === "reference" && (
        <ReferenceSelect field={field} value={value} onChange={(nextValue) => onChange(field.name, nextValue)} />
      )}
      {field.type !== "select" && field.type !== "reference" && (
        <Input
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          type={field.type || "text"}
          required={field.required}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function ReferenceSelect({ field, value, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get(field.endpoint, { params: { take: 100 } })
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response.data.data) ? response.data.data : response.data.data?.data || [];
        setOptions(rows);
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, [field.endpoint]);

  return (
    <Select value={value} required={field.required} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option[field.optionLabel] || option.name || option.id}
        </option>
      ))}
    </Select>
  );
}

function defaultValues(config) {
  const values = {};
  for (const field of config.fields) {
    if (field.name === "receivedOn") values[field.name] = new Date().toISOString().slice(0, 10);
    if (field.name === "dueAt") values[field.name] = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  }
  return values;
}

function normalizePayload(values, fields) {
  const numericFields = new Set(fields.filter((field) => field.type === "number").map((field) => field.name));
  const jsonFields = new Set(fields.filter((field) => field.type === "json" || field.name.endsWith("Json")).map((field) => field.name));
  return Object.fromEntries(
    Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => {
        if (numericFields.has(key)) return [key, Number(value)];
        if (jsonFields.has(key)) return [key, parseJsonValue(value)];
        return [key, value];
      })
  );
}

function parseJsonValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatInputValue(field, value) {
  if (value === null || value === undefined) return "";
  if (field.type === "date") return String(value).slice(0, 10);
  if (field.type === "datetime-local") return String(value).slice(0, 16);
  return String(value);
}
