import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { money } from "../../lib/utils";

export const BOOKING_STATUS_TONE = {
  DRAFT: "slate",
  PENDING_APPROVAL: "amber",
  BOOKED: "blue",
  AGREEMENT: "amber",
  REGISTERED: "green",
  POSSESSION: "violet",
  CANCEL_REQUESTED: "red",
  CANCELLED: "red",
};

const RECEIPT_STATUS_TONE = {
  RECORDED: "blue",
  PENDING_CLEARANCE: "amber",
  CLEARED: "green",
  BOUNCED: "red",
};

const DEMAND_STATUS_TONE = {
  UPCOMING: "slate",
  DUE: "amber",
  OVERDUE: "red",
  PAID: "green",
  WAIVED: "slate",
};

export function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export function BookingDetailDialog({ bookingId, onClose, onChanged }) {
  const [booking, , loading, , reload] = useApiData(`/bookings/${bookingId}`, null, {});
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action, successMessage) {
    setBusy(true);
    try {
      await action();
      await reload();
      onChanged?.();
      if (successMessage) toast.success(successMessage);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading || !booking) {
    return (
      <Dialog open title="Booking detail" onClose={onClose} className="max-w-2xl">
        <Skeleton className="h-64 w-full rounded-md" />
      </Dialog>
    );
  }

  const receipts = booking.receipts || [];
  const demands = booking.demands || [];
  const collected = receipts
    .filter((r) => ["RECORDED", "PENDING_CLEARANCE", "CLEARED"].includes(r.status))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const collectedPercent = booking.agreementValue > 0 ? Math.round((collected / Number(booking.agreementValue)) * 100) : 0;

  const canSubmit = booking.status === "DRAFT";
  const canApprove = booking.status === "PENDING_APPROVAL";
  const canCancel = !["CANCELLED"].includes(booking.status);

  return (
    <Dialog
      open
      title={booking.bookingNumber}
      description={`${booking.project?.name || ""} · ${booking.unit?.unitCode || ""}`}
      onClose={onClose}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-950">{booking.customer?.name || booking.lead?.name || "No customer linked"}</p>
            <p className="text-sm text-slate-500">{booking.customer?.phone || booking.lead?.phone || ""}</p>
          </div>
          <Badge tone={BOOKING_STATUS_TONE[booking.status] || "slate"}>{humanize(booking.status)}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="Agreement value" value={money(booking.agreementValue)} />
          <InfoRow label="Discount" value={booking.discountAmount ? money(booking.discountAmount) : "-"} />
          <InfoRow label="Collected" value={`${money(collected)} (${collectedPercent}%)`} />
          <InfoRow label="Funding" value={humanize(booking.fundingType)} />
          {booking.fundingType === "HOME_LOAN" && (
            <>
              <InfoRow label="Bank" value={booking.bankName || "-"} />
              <InfoRow label="Loan amount" value={booking.loanAmount ? money(booking.loanAmount) : "-"} />
            </>
          )}
          {booking.broker?.firmName && (
            <InfoRow
              label="Channel partner"
              value={`${booking.broker.firmName}${booking.brokeragePct ? ` · ${booking.brokeragePct}%` : ""}`}
            />
          )}
          <InfoRow label="Booked on" value={formatDate(booking.bookedOn)} />
          <InfoRow label="Agreement signed" value={formatDate(booking.agreementSignedOn)} />
          <InfoRow label="Registered" value={formatDate(booking.registeredOn)} />
          <InfoRow label="Possession" value={formatDate(booking.possessionOn)} />
        </div>

        {booking.status === "CANCELLED" && booking.cancelReason && (
          <Card className="p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Cancellation reason</p>
            <p className="mt-1 text-sm text-slate-700">{booking.cancelReason}</p>
          </Card>
        )}

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">Payment schedule</p>
          {demands.length === 0 ? (
            <p className="text-sm text-[#5B6472]">No demands raised yet.</p>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F5F6F8] text-left text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">
                    <th className="px-3 py-2">Milestone</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-right">Paid</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map((d) => (
                    <tr key={d.id} className="border-t border-[#EEF0F3]">
                      <td className="px-3 py-2 font-medium text-[#101418]">{d.label}</td>
                      <td className="px-3 py-2 text-[#5B6472]">{formatDate(d.dueDate)}</td>
                      <td className="font-mono-ui px-3 py-2 text-right">{money(d.amount)}</td>
                      <td className="font-mono-ui px-3 py-2 text-right">{money(d.paidAmount)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={DEMAND_STATUS_TONE[d.status] || "slate"}>{humanize(d.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">Receipts</p>
          {receipts.length === 0 ? (
            <p className="text-sm text-[#5B6472]">No receipts recorded yet.</p>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F5F6F8] text-left text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Mode</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Received</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} className="border-t border-[#EEF0F3]">
                      <td className="px-3 py-2 font-medium text-[#101418]">{r.receiptNumber}</td>
                      <td className="px-3 py-2 text-[#5B6472]">{humanize(r.mode)}</td>
                      <td className="font-mono-ui px-3 py-2 text-right">{money(r.amount)}</td>
                      <td className="px-3 py-2 text-[#5B6472]">{formatDate(r.receivedOn)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={RECEIPT_STATUS_TONE[r.status] || "slate"}>{humanize(r.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        {cancelling ? (
          <div className="space-y-2 rounded-md border border-slate-200 p-3">
            <label className="text-sm font-medium text-slate-700">Cancellation reason</label>
            <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Optional" />
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setCancelling(false)}>
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  const ok = await run(() => api.patch(`/bookings/${booking.id}/cancel`, { cancelReason }), "Booking cancelled.");
                  if (ok) setCancelling(false);
                }}
              >
                Confirm cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canCancel && (
                <Button type="button" variant="outlineDestructive" size="sm" disabled={busy} onClick={() => setCancelling(true)}>
                  Cancel booking
                </Button>
              )}
              {canSubmit && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => run(() => api.patch(`/bookings/${booking.id}/submit`), "Submitted for approval.")}
                >
                  Submit for approval
                </Button>
              )}
              {canApprove && (
                <Button type="button" size="sm" disabled={busy} onClick={() => run(() => api.patch(`/bookings/${booking.id}/approve`), "Booking approved.")}>
                  Approve
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
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
