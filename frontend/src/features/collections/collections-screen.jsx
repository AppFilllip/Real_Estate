import { useState } from "react";
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
import { money } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";

const DEMAND_STATUS_TONE = {
  UPCOMING: "blue",
  DUE: "amber",
  OVERDUE: "red",
  PARTIAL: "amber",
  PAID: "green",
  WAIVED: "slate",
};

const RECEIPT_STATUS_TONE = {
  RECORDED: "blue",
  PENDING_CLEARANCE: "amber",
  CLEARED: "green",
  BOUNCED: "red",
};

const PAYMENT_MODES = ["CASH", "UPI", "NEFT_RTGS", "CHEQUE", "CARD", "ONLINE_LINK"];

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function outstandingOf(demand) {
  return BigInt(demand.amount || 0) - BigInt(demand.paidAmount || 0);
}

export function CollectionsScreen() {
  const [ageing, , ageingLoading, , reloadAgeing] = useApiData("/collections/ageing", []);
  const [demandsResponse, , demandsLoading, , reloadDemands] = useApiData("/collections/due-soon", { data: [] });
  const demands = Array.isArray(demandsResponse) ? demandsResponse : demandsResponse.data || [];
  const [chequesResponse, , , , reloadCheques] = useApiData("/collections/cheques", { data: [] });
  const cheques = Array.isArray(chequesResponse) ? chequesResponse : chequesResponse.data || [];

  const [milestonesResponse] = useApiData("/milestones", { data: [] }, { status: "PLANNED", take: 100 });
  const milestones = Array.isArray(milestonesResponse) ? milestonesResponse : milestonesResponse.data || [];
  const [projectsResponse] = useApiData("/projects", { data: [] }, { take: 100 });
  const projects = Array.isArray(projectsResponse) ? projectsResponse : projectsResponse.data || [];
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

  const [receiptDialog, setReceiptDialog] = useState({ open: false, demand: null });

  function showUnavailable() {
    toast.info("Email service is not configured yet.");
  }

  function refreshAll() {
    reloadAgeing();
    reloadDemands();
    reloadCheques();
  }

  return (
    <Screen title="Due & overdue" description="Track demands, receipts, cheques, and construction milestones.">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={showUnavailable}>
          Send reminder ladder
        </Button>
        <Button size="sm" disabled={demands.length === 0} onClick={() => setReceiptDialog({ open: true, demand: null })}>
          Record receipt
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {ageingLoading
          ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-20" />)
          : ageing.map((bucket) => (
              <Card key={bucket.label} className="p-3.5">
                <p className="text-[11.5px] font-semibold text-[#5B6472]">{bucket.label}</p>
                <p className="font-mono-ui mt-1 text-[19px] font-semibold text-[#101418]">{bucket.count}</p>
                <p className="text-[11px] text-[#8B93A1]">{money(bucket.amount)}</p>
              </Card>
            ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Card className="overflow-hidden">
          <div className="border-b border-[#E2E5EA] px-4.5 py-3.5 text-base font-semibold">Demands due this week</div>
          {demandsLoading ? (
            <div className="p-4 text-sm text-[#5B6472]">Loading…</div>
          ) : demands.length === 0 ? (
            <div className="p-4 text-sm text-[#5B6472]">Nothing due this week.</div>
          ) : (
            demands.map((demand) => {
              const overdue = demand.status === "OVERDUE";
              const outstanding = outstandingOf(demand);
              return (
                <div key={demand.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-3.5 py-2.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-[#101418]">{demand.customerName || "-"}</div>
                    <div className="font-mono-ui text-[11.5px] text-[#8B93A1]">
                      {[demand.projectName, demand.unitCode, demand.label].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono-ui text-[13.5px] font-semibold">{money(outstanding)}</div>
                    <div className={`text-xs ${overdue ? "text-red-600" : "text-[#5B6472]"}`}>{formatDate(demand.dueDate)}</div>
                  </div>
                  <Badge tone={DEMAND_STATUS_TONE[demand.status] || "slate"}>{humanize(demand.status)}</Badge>
                  <div className="flex gap-1.5">
                    <Button variant="secondary" size="sm" onClick={showUnavailable}>
                      Remind
                    </Button>
                    <Button size="sm" onClick={() => setReceiptDialog({ open: true, demand })}>
                      Receipt
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </Card>

        <div className="flex flex-col gap-3.5">
          <Card className="p-4.5">
            <div className="mb-2.5 text-base font-semibold">Cheque tracker</div>
            {cheques.length === 0 ? (
              <p className="text-sm text-[#5B6472]">No cheque receipts recorded.</p>
            ) : (
              cheques.map((cheque) => (
                <div key={cheque.id} className="flex items-center gap-2.5 border-b border-[#EEF0F3] py-2 last:border-b-0">
                  <div className="flex-1">
                    <div className="font-mono-ui text-[12.5px] font-semibold">{cheque.chequeNumber || cheque.receiptNumber}</div>
                    <div className="text-[11.5px] text-[#8B93A1]">{[cheque.customerName, cheque.bankName].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Badge tone={RECEIPT_STATUS_TONE[cheque.status] || "slate"}>{humanize(cheque.status)}</Badge>
                </div>
              ))
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-base font-semibold">Construction milestones</div>
            {milestones.length === 0 ? (
              <p className="text-sm text-[#5B6472]">No planned milestones.</p>
            ) : (
              milestones.slice(0, 6).map((milestone) => (
                <div key={milestone.id} className="flex items-center gap-2.5 border-b border-[#EEF0F3] py-2 last:border-b-0">
                  <span className="h-2 w-2 flex-none rounded-full bg-[#D97706]" />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold">{milestone.name}</div>
                    <div className="text-[11.5px] text-[#8B93A1]">
                      {[projectNameById.get(milestone.projectId), milestone.plannedDate ? formatDate(milestone.plannedDate) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="text-[11.5px] font-semibold text-[#5B6472]">{humanize(milestone.status)}</span>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {receiptDialog.open && (
        <RecordReceiptDialog
          initialDemand={receiptDialog.demand}
          demands={demands}
          onClose={() => setReceiptDialog({ open: false, demand: null })}
          onSaved={refreshAll}
        />
      )}
    </Screen>
  );
}

function RecordReceiptDialog({ initialDemand, demands, onClose, onSaved }) {
  const [demandId, setDemandId] = useState(initialDemand?.id || "");
  const demand = initialDemand || demands.find((d) => d.id === demandId) || null;
  const outstanding = demand ? outstandingOf(demand) : 0n;

  const [values, setValues] = useState({
    receiptNumber: `RC/${initialDemand?.projectShortCode || "GEN"}/${Math.floor(1000 + Math.random() * 9000)}`,
    amount: initialDemand && outstanding > 0n ? outstanding.toString() : "",
    mode: "UPI",
    receivedOn: new Date().toISOString().slice(0, 10),
    transactionRef: "",
    bankName: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  function setValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function selectDemand(id) {
    setDemandId(id);
    const picked = demands.find((d) => d.id === id);
    if (picked) {
      const pickedOutstanding = outstandingOf(picked);
      setValue("receiptNumber", `RC/${picked.projectShortCode || "GEN"}/${Math.floor(1000 + Math.random() * 9000)}`);
      setValue("amount", pickedOutstanding > 0n ? pickedOutstanding.toString() : "");
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (!demand) {
      toast.error("Pick which due amount this receipt is for.");
      return;
    }
    if (!values.receiptNumber || !values.amount || !values.mode || !values.receivedOn) {
      toast.error("Receipt number, amount, mode, and date are required.");
      return;
    }
    setSaving(true);
    try {
      const receiptResponse = await api.post("/receipts", {
        bookingId: demand.bookingId,
        receiptNumber: values.receiptNumber,
        amount: values.amount,
        mode: values.mode,
        receivedOn: values.receivedOn,
        transactionRef: values.transactionRef || undefined,
        bankName: values.bankName || undefined,
        remarks: values.remarks || undefined,
      });
      const receipt = receiptResponse.data.data;
      await api.post(`/receipts/${receipt.id}/allocations`, {
        demandId: demand.id,
        amount: values.amount,
      });
      toast.success("Receipt recorded.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Could not record receipt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      title="Record receipt"
      description={
        demand
          ? `${demand.customerName || "-"} · ${[demand.projectName, demand.unitCode, demand.label].filter(Boolean).join(" · ")}`
          : "Pick which due amount this payment covers."
      }
      onClose={onClose}
      className="max-w-lg"
    >
      <form className="space-y-4" onSubmit={submit}>
        {!initialDemand && (
          <Field label="Due amount" required>
            <Select value={demandId} onChange={(e) => selectDemand(e.target.value)} required>
              <option value="">Select</option>
              {demands.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.customerName} — {[d.projectName, d.unitCode, d.label].filter(Boolean).join(" · ")} ({money(outstandingOf(d))} due)
                </option>
              ))}
            </Select>
          </Field>
        )}
        {demand && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Receipt number" required>
                <Input value={values.receiptNumber} onChange={(e) => setValue("receiptNumber", e.target.value)} required />
              </Field>
              <Field label="Amount" required>
                <Input type="number" value={values.amount} onChange={(e) => setValue("amount", e.target.value)} required />
              </Field>
              <Field label="Mode" required>
                <Select value={values.mode} onChange={(e) => setValue("mode", e.target.value)}>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {humanize(m)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Received on" required>
                <Input type="date" value={values.receivedOn} onChange={(e) => setValue("receivedOn", e.target.value)} required />
              </Field>
              {values.mode === "CHEQUE" && (
                <Field label="Bank name">
                  <Input value={values.bankName} onChange={(e) => setValue("bankName", e.target.value)} />
                </Field>
              )}
              {values.mode !== "CASH" && (
                <Field label="Transaction ref">
                  <Input value={values.transactionRef} onChange={(e) => setValue("transactionRef", e.target.value)} placeholder="Optional" />
                </Field>
              )}
            </div>
            <Field label="Remarks">
              <Input value={values.remarks} onChange={(e) => setValue("remarks", e.target.value)} placeholder="Optional" />
            </Field>
            <p className="text-[12px] text-[#8B93A1]">Outstanding on this demand: {money(outstanding)}</p>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !demand}>
            {saving ? "Recording…" : "Record receipt"}
          </Button>
        </div>
      </form>
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
