import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { money } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";
import { BookingDetailDialog, BOOKING_STATUS_TONE, humanize, formatDate } from "./booking-detail-dialog";

const STATUS_OPTIONS = ["DRAFT", "PENDING_APPROVAL", "BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION", "CANCEL_REQUESTED", "CANCELLED"];

export function BookingsScreen() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const take = 20;

  const [response, , loading, error, reload] = useApiData(
    "/bookings/summary",
    { data: [], total: 0 },
    { take, skip: page * take, ...(status ? { status } : {}) }
  );
  const rows = response.data || [];
  const total = response.total || 0;

  function showUnavailable(label) {
    toast.info(`${label} is not connected yet.`);
  }

  function exportRows() {
    if (!rows.length) {
      toast.error("No rows available to export.");
      return;
    }
    const header = ["Booking", "Customer", "Unit", "Project", "Value", "Booked on", "Collected %", "Status", "Partner"].join(",");
    const body = rows
      .map((row) =>
        [row.bookingNumber, row.customerName, row.unitCode, row.projectName, money(row.agreementValue), formatDate(row.bookedOn), `${row.collectedPercent}%`, humanize(row.status), row.brokerName || "Direct"]
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Screen title={`Bookings ${total}`} description="Track bookings, collections progress, and agreement status.">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Select
          className="w-56"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {humanize(option)}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportRows}>
            Export register
          </Button>
          <Button size="sm" onClick={() => showUnavailable("New booking")}>
            + New booking
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Booked on</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Partner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono-ui font-semibold">
                      <button
                        type="button"
                        className="text-[#2E5BFF] hover:underline"
                        onClick={() => setSelectedId(row.id)}
                      >
                        {row.bookingNumber}
                      </button>
                    </TableCell>
                    <TableCell className="font-semibold text-[#101418]">{row.customerName || "-"}</TableCell>
                    <TableCell className="font-mono-ui">{row.unitCode || "-"}</TableCell>
                    <TableCell className="font-mono-ui text-right">{money(row.agreementValue)}</TableCell>
                    <TableCell>{formatDate(row.bookedOn)}</TableCell>
                    <TableCell className="min-w-[130px]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F3]">
                          <div className="h-full bg-[#2E5BFF]" style={{ width: `${Math.min(row.collectedPercent, 100)}%` }} />
                        </div>
                        <span className="font-mono-ui text-xs font-semibold">{row.collectedPercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge tone={BOOKING_STATUS_TONE[row.status] || "slate"}>{humanize(row.status)}</Badge>
                    </TableCell>
                    <TableCell>{row.brokerName || "Direct"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {total === 0 ? "0" : `${page * take + 1}–${Math.min((page + 1) * take, total)}`} of {total}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" disabled={(page + 1) * take >= total} onClick={() => setPage((value) => value + 1)}>
            Next
          </Button>
        </div>
      </div>

      {selectedId && (
        <BookingDetailDialog
          bookingId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            reload();
          }}
        />
      )}
    </Screen>
  );
}
