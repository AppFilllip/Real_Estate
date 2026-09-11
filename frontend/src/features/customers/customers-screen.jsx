import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { cn, money } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";
import { BookingDetailDialog, BOOKING_STATUS_TONE, formatDate } from "../bookings/booking-detail-dialog";
import { CustomerDetailDialog } from "./customer-detail-dialog";

const TABS = [
  { key: "", label: "All" },
  { key: "BOOKED", label: "Booked" },
  { key: "AGREEMENT", label: "Agreement pending" },
  { key: "REGISTERED", label: "Registered" },
  { key: "POSSESSION", label: "Possession" },
];

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CustomersScreen() {
  const [tab, setTab] = useState("");
  const [page, setPage] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const take = 20;

  const [kpisResponse] = useApiData("/customers/summary/kpis", {});
  const [response, , loading, error, reload] = useApiData(
    "/customers/summary",
    { data: [], total: 0 },
    { take, skip: page * take, ...(tab ? { status: tab } : {}) }
  );
  const rows = response.data || [];
  const total = response.total || 0;

  return (
    <Screen title="Customers" description="Booked customers, collections progress, and agreement status.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Booked customers" value={kpisResponse.bookedCustomers} accent="#2E5BFF" />
        <KpiTile label="Agreement pending" value={kpisResponse.agreementPending} accent="#D97706" />
        <KpiTile label="Registered" value={kpisResponse.registered} accent="#16A34A" />
        <KpiTile label="Possession" value={kpisResponse.possession} accent="#0D9488" />
      </div>

      <div className="flex gap-1 overflow-auto border-b border-[#E2E5EA]">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              setPage(0);
            }}
            className={cn(
              "whitespace-nowrap border-b-2 px-3.5 py-2 text-sm font-semibold",
              tab === item.key ? "border-blue-600 text-blue-600" : "border-transparent text-[#5B6472] hover:text-[#101418]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="overflow-hidden">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead className="text-right">Agreement value</TableHead>
                <TableHead>Payment progress</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Stage</TableHead>
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
                    No booked customers found.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((row) => (
                  <TableRow key={row.bookingId}>
                    <TableCell className="font-semibold">
                      {row.customerId ? (
                        <button
                          type="button"
                          className="text-[#101418] hover:text-[#2E5BFF] hover:underline"
                          onClick={() => setSelectedCustomerId(row.customerId)}
                        >
                          {row.customerName || "-"}
                        </button>
                      ) : (
                        row.customerName || "-"
                      )}
                    </TableCell>
                    <TableCell className="font-mono-ui">
                      <button
                        type="button"
                        className="text-[#2E5BFF] hover:underline"
                        onClick={() => setSelectedBookingId(row.bookingId)}
                      >
                        {row.unitCode || "-"}
                      </button>
                    </TableCell>
                    <TableCell>{row.projectName || "-"}</TableCell>
                    <TableCell className="font-mono-ui">{formatDate(row.bookedOn)}</TableCell>
                    <TableCell className="font-mono-ui text-right">{money(row.agreementValue)}</TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F3]">
                          <div className="h-full bg-[#2E5BFF]" style={{ width: `${Math.min(row.collectedPercent, 100)}%` }} />
                        </div>
                        <span className="font-mono-ui text-xs font-semibold">{row.collectedPercent}%</span>
                      </div>
                      <div className="font-mono-ui mt-0.5 text-[11px] text-[#8B93A1]">{money(row.received)} collected</div>
                    </TableCell>
                    <TableCell className="font-mono-ui text-right">{money(row.outstanding)}</TableCell>
                    <TableCell>
                      <Badge tone={BOOKING_STATUS_TONE[row.status] || "slate"}>{humanize(row.status)}</Badge>
                    </TableCell>
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

      {selectedBookingId && (
        <BookingDetailDialog
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
          onChanged={() => {
            reload();
          }}
        />
      )}
      {selectedCustomerId && (
        <CustomerDetailDialog customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      )}
    </Screen>
  );
}

function KpiTile({ label, value, accent }) {
  return (
    <Card className="p-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <p className="text-[11.5px] font-semibold text-[#5B6472]">{label}</p>
      <p className="font-mono-ui mt-1.5 text-[21px] font-semibold text-[#101418]">{value ?? "…"}</p>
    </Card>
  );
}
