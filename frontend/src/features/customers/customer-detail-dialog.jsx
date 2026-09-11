import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { money } from "../../lib/utils";
import { BookingDetailDialog, BOOKING_STATUS_TONE, humanize, formatDate } from "../bookings/booking-detail-dialog";

export function CustomerDetailDialog({ customerId, onClose }) {
  const [customer, , loading] = useApiData(`/customers/${customerId}`, null, {});
  const [rmResponse] = useApiData(`/users/${customer?.relationshipManagerId}`, null, {}, { enabled: Boolean(customer?.relationshipManagerId) });
  const [bookingsResponse, , bookingsLoading] = useApiData(
    "/bookings",
    { data: [] },
    { customerId, take: 50 },
    { enabled: Boolean(customerId) }
  );
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const bookings = Array.isArray(bookingsResponse) ? bookingsResponse : bookingsResponse.data || [];
  const address = customer?.addressJson;
  const addressLine = address ? [address.line1, address.city, address.state, address.pincode].filter(Boolean).join(", ") : "";

  if (loading || !customer) {
    return (
      <Dialog open title="Customer detail" onClose={onClose} className="max-w-2xl">
        <Skeleton className="h-64 w-full rounded-md" />
      </Dialog>
    );
  }

  return (
    <Dialog open title={customer.name} description={customer.phone} onClose={onClose} className="max-w-2xl">
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Badge tone={customer.portalAccessEnabled ? "green" : "slate"}>
            {customer.portalAccessEnabled ? "Portal enabled" : "Portal not enabled"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="PAN" value={customer.panLast4 ? `XXXXX${customer.panLast4}` : "-"} />
          <InfoRow label="Customer since" value={formatDate(customer.createdAt)} />
          <InfoRow label="Address" value={addressLine} />
          <InfoRow label="Relationship manager" value={rmResponse?.name} />
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">Bookings</p>
          {bookingsLoading ? (
            <Skeleton className="h-24 w-full rounded-md" />
          ) : bookings.length === 0 ? (
            <p className="text-sm text-[#5B6472]">No bookings linked to this customer.</p>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F5F6F8] text-left text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t border-[#EEF0F3]">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="font-semibold text-[#2E5BFF] hover:underline"
                          onClick={() => setSelectedBookingId(b.id)}
                        >
                          {b.bookingNumber}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-[#5B6472]">{b.project?.name || "-"}</td>
                      <td className="font-mono-ui px-3 py-2 text-[#5B6472]">{b.unit?.unitCode || "-"}</td>
                      <td className="font-mono-ui px-3 py-2 text-right">{money(b.agreementValue)}</td>
                      <td className="px-3 py-2">
                        <Badge tone={BOOKING_STATUS_TONE[b.status] || "slate"}>{humanize(b.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <div className="flex justify-end border-t border-[#EEF0F3] pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {selectedBookingId && <BookingDetailDialog bookingId={selectedBookingId} onClose={() => setSelectedBookingId(null)} />}
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
