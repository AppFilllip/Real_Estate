import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { money } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ReportsScreen() {
  const [execResponse, , execLoading] = useApiData("/reports/exec-performance", { rows: [] });
  const execRows = execResponse.rows || [];

  const [stageResponse] = useApiData("/reports/stage-conversion", []);
  const stages = Array.isArray(stageResponse) ? stageResponse : stageResponse.data || [];
  const stageMax = Math.max(1, ...stages.map((stage) => stage.count));

  return (
    <Screen title="Reports" description="Executive performance and stage conversion, company-wide.">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#E2E5EA] px-5 py-3.5">
          <div className="text-base font-semibold">Executive performance</div>
          <span className="text-xs text-[#8B93A1]">Sorted by bookings</span>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exec</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {execLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!execLoading && execRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                    No sales execs found.
                  </TableCell>
                </TableRow>
              )}
              {!execLoading &&
                execRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6.5 w-6.5 flex-none items-center justify-center rounded-full bg-[#E8EDFF] text-[10.5px] font-bold text-[#2E5BFF]">
                          {initials(row.name)}
                        </span>
                        <span className="font-semibold text-[#101418]">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono-ui text-right">{row.leads}</TableCell>
                    <TableCell className="font-mono-ui text-right">{row.calls}</TableCell>
                    <TableCell className="font-mono-ui text-right">{row.visits}</TableCell>
                    <TableCell className="font-mono-ui text-right font-semibold text-[#2E5BFF]">{row.bookings}</TableCell>
                    <TableCell className="font-mono-ui text-right">{money(row.value)}</TableCell>
                    <TableCell className="min-w-[140px]">
                      {row.target > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0F3]">
                            <div className="h-full bg-[#2E5BFF]" style={{ width: `${row.targetPercent}%` }} />
                          </div>
                          <span className="font-mono-ui text-xs font-semibold">
                            {row.bookings}/{row.target}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-[#8B93A1]">No target set</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-base font-semibold">Stage conversion · lead to booking</div>
          <span className="text-xs text-[#8B93A1]">All leads</span>
        </div>
        <div className="flex h-[190px] items-end gap-2.5">
          {stages.map((stage) => (
            <div key={stage.stage} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="font-mono-ui text-xs font-semibold">{stage.count}</div>
              <div
                className="w-full max-w-[36px] rounded-t bg-[#2E5BFF]"
                style={{ height: `${Math.max(4, (stage.count / stageMax) * 100)}px` }}
              />
              <div className="text-center text-[11px] leading-tight text-[#5B6472]">{humanize(stage.stage)}</div>
              <div className="font-mono-ui text-[11px] text-[#8B93A1]">{stage.percent}%</div>
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  );
}
