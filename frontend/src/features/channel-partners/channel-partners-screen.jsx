import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { money } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";
import { RecordDialog } from "../data/record-dialog";

const TIER_TONE = { GOLD: "amber", SILVER: "slate", BRONZE: "violet" };
const STATUS_TONE = { PENDING: "amber", ACTIVE: "green", SUSPENDED: "red" };

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ChannelPartnersScreen() {
  const [response, , loading, error, reloadBrokers] = useApiData("/brokers/summary", { data: [], total: 0 }, { take: 100 });
  const brokers = response.data || [];
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);

  const [disputesResponse, , , , reloadDisputes] = useApiData("/lead-disputes", { data: [] }, { status: "OPEN" });
  const disputes = Array.isArray(disputesResponse) ? disputesResponse : disputesResponse.data || [];

  const [leadsResponse] = useApiData("/leads", { data: [] }, { take: 200 });
  const leads = Array.isArray(leadsResponse) ? leadsResponse : leadsResponse.data || [];
  const leadNameById = new Map(leads.map((lead) => [lead.id, lead.name]));

  const brokerNameById = new Map(brokers.map((broker) => [broker.id, broker.firmName || broker.contactPerson]));

  async function awardDispute(dispute, brokerId) {
    try {
      await api.patch(`/lead-disputes/${dispute.id}/resolve`, { awardedToBrokerId: brokerId });
      toast.success("Dispute resolved.");
      reloadDisputes();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not resolve dispute.");
    }
  }

  return (
    <Screen title={`Partners ${response.total ?? brokers.length}`} description="Broker performance, commissions, and lead disputes.">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAddPartnerOpen(true)}>
          + Add partner
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3.5 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <Card className="overflow-hidden">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Pending commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && brokers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No channel partners found.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  brokers.map((broker) => (
                    <TableRow key={broker.id}>
                      <TableCell>
                        <div className="font-semibold text-[#101418]">{broker.firmName || "-"}</div>
                        <div className="text-[11.5px] text-[#8B93A1]">{broker.contactPerson}</div>
                      </TableCell>
                      <TableCell>
                        <Badge tone={TIER_TONE[broker.tier] || "slate"}>{humanize(broker.tier)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono-ui text-right">{broker.leads}</TableCell>
                      <TableCell className="font-mono-ui text-right">{broker.visits}</TableCell>
                      <TableCell className="font-mono-ui text-right">{broker.bookings}</TableCell>
                      <TableCell className="font-mono-ui text-right">{money(broker.pendingCommission)}</TableCell>
                      <TableCell>
                        <Badge tone={STATUS_TONE[broker.status] || "slate"}>{humanize(broker.status)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-4.5">
          <div className="mb-2.5 text-base font-semibold">Lead disputes</div>
          {disputes.length === 0 ? (
            <p className="text-sm text-[#5B6472]">No open disputes.</p>
          ) : (
            disputes.map((dispute) => {
              const brokerAName = brokerNameById.get(dispute.brokerAId) || "Broker A";
              const brokerBName = dispute.brokerBId ? brokerNameById.get(dispute.brokerBId) || "Broker B" : null;
              return (
                <div key={dispute.id} className="mb-2 rounded-lg border border-[#FCE8E8] bg-[#FEF6F6] p-3">
                  <div className="text-[13px] font-semibold">{leadNameById.get(dispute.leadId) || "Lead"}</div>
                  <div className="mt-0.5 text-xs leading-[18px] text-[#5B6472]">
                    Claimed by {brokerAName}
                    {brokerBName ? ` and ${brokerBName}` : ""}.
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <Button size="sm" onClick={() => awardDispute(dispute, dispute.brokerAId)}>
                      Award to {brokerAName}
                    </Button>
                    {dispute.brokerBId && (
                      <Button variant="secondary" size="sm" onClick={() => awardDispute(dispute, dispute.brokerBId)}>
                        Award to {brokerBName}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>

      <RecordDialog
        title="Brokers"
        mode="create"
        record={null}
        open={addPartnerOpen}
        onClose={() => setAddPartnerOpen(false)}
        onSaved={() => {
          reloadBrokers();
          toast.success("Channel partner added.");
        }}
      />
    </Screen>
  );
}
