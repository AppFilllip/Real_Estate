import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { money, moneyCompact } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";
import { RecordDialog } from "../data/record-dialog";

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function MarketingScreen() {
  const [projectFilter, setProjectFilter] = useState("");
  const [paidOnly, setPaidOnly] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  const [kpis] = useApiData("/campaigns/summary/kpis", {});
  const [response, , loading, , reloadCampaigns] = useApiData(
    "/campaigns/summary",
    { data: [], total: 0 },
    { take: 50, ...(projectFilter ? { projectId: projectFilter } : {}), ...(paidOnly ? { paidOnly: true } : {}) }
  );
  const campaigns = response.data || [];

  const [projectsResponse] = useApiData("/projects", { data: [] }, { take: 100 });
  const projects = Array.isArray(projectsResponse) ? projectsResponse : projectsResponse.data || [];

  const [numbersResponse] = useApiData("/calls/numbers", []);
  const numbers = Array.isArray(numbersResponse) ? numbersResponse : numbersResponse.data || [];

  const [sourceMixResponse] = useApiData("/campaigns/summary/source-mix", []);
  const sourceMix = Array.isArray(sourceMixResponse) ? sourceMixResponse : sourceMixResponse.data || [];

  return (
    <Screen title="Campaign performance" description="Spend, lead mix, and conversion by campaign.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total spend" value={moneyCompact(kpis.totalSpend)} title={money(kpis.totalSpend)} />
        <Kpi label="Campaigns" value={kpis.totalCampaigns ?? "…"} />
        <Kpi label="Leads sourced" value={kpis.totalLeads ?? "…"} />
        <Kpi label="Cost per lead" value={moneyCompact(kpis.costPerLead)} title={money(kpis.costPerLead)} />
        <Kpi label="Booked" value={kpis.bookedLeads ?? "…"} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-48" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Button variant={paidOnly ? "default" : "secondary"} size="sm" onClick={() => setPaidOnly((v) => !v)}>
            Paid only
          </Button>
        </div>
        <Button size="sm" onClick={() => setNewCampaignOpen(true)}>
          + New campaign
        </Button>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card className="overflow-hidden">
          <div className="border-b border-[#E2E5EA] px-5 py-3.5 text-base font-semibold">Campaigns</div>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Qualified</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Cost/lead</TableHead>
                  <TableHead className="text-right">Cost/booking</TableHead>
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
                {!loading && campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div className="font-semibold text-[#101418]">{campaign.name}</div>
                        <div className="text-[11px] text-[#8B93A1]">{humanize(campaign.channel)}</div>
                      </TableCell>
                      <TableCell className="font-mono-ui text-right">{money(campaign.spend)}</TableCell>
                      <TableCell className="font-mono-ui text-right">{campaign.leads}</TableCell>
                      <TableCell className="font-mono-ui text-right">{campaign.qualified}</TableCell>
                      <TableCell className="font-mono-ui text-right">{campaign.visits}</TableCell>
                      <TableCell className="font-mono-ui text-right font-semibold text-[#2E5BFF]">{campaign.bookings}</TableCell>
                      <TableCell className="font-mono-ui text-right">{money(campaign.costPerLead)}</TableCell>
                      <TableCell className="font-mono-ui text-right">{money(campaign.costPerBooking)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-4.5">
            <div className="mb-3.5 text-base font-semibold">Lead mix by source</div>
            <div className="flex flex-col gap-2.5">
              {sourceMix.map((source) => (
                <div key={source.sourceId || "direct"}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-[#5B6472]">{source.name}</span>
                    <span className="font-mono-ui font-semibold">
                      {source.count}
                      <span className="ml-1 font-normal text-[#8B93A1]">{source.percent}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#EEF0F3]">
                    <div className="h-full bg-[#2E5BFF]" style={{ width: `${source.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-[#E2E5EA] px-5 py-3.5 text-base font-semibold">IVR line mapping</div>
            {numbers.map((number) => (
              <div key={number.id} className="flex items-center gap-3 border-b border-[#EEF0F3] px-5 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="font-mono-ui text-[12.5px] font-semibold">{number.number}</div>
                  <div className="mt-0.5 truncate text-[11.5px] text-[#8B93A1]">{number.label}</div>
                </div>
                {number.missedToday > 0 && (
                  <div className="font-mono-ui text-xs font-semibold text-[#DC2626]">{number.missedToday} missed</div>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>

      <RecordDialog
        title="Marketing"
        mode="create"
        record={null}
        open={newCampaignOpen}
        onClose={() => setNewCampaignOpen(false)}
        onSaved={() => {
          reloadCampaigns();
          toast.success("Campaign created.");
        }}
      />
    </Screen>
  );
}

function Kpi({ label, value, title }) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-[11.5px] font-semibold text-[#5B6472]">{label}</p>
      <p className="font-mono-ui mt-1.5 truncate text-[21px] font-semibold text-[#101418]" title={title}>
        {value}
      </p>
    </Card>
  );
}
