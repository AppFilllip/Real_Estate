import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useApiData } from "../../hooks/use-api-data";
import { cn } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";

const TABS = [
  { key: "", label: "All" },
  { key: "COMPLETED", label: "Completed" },
  { key: "MISSED", label: "Missed" },
  { key: "VOICEMAIL", label: "Voicemail" },
  { key: "FAILED", label: "Failed" },
];

const STATUS_TONE = {
  INITIATED: "blue",
  RINGING: "blue",
  CONNECTED: "green",
  COMPLETED: "green",
  MISSED: "red",
  FAILED: "red",
  VOICEMAIL: "amber",
};

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatTalk(seconds) {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function CallsScreen() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const take = 20;

  const [response, , loading, error] = useApiData(
    "/calls/summary",
    { data: [], total: 0 },
    { take, skip: page * take, ...(status ? { status } : {}) }
  );
  const calls = response.data || [];
  const total = response.total || 0;

  const [missedResponse] = useApiData("/calls/missed-queue", []);
  const missed = Array.isArray(missedResponse) ? missedResponse : missedResponse.data || [];

  const [numbersResponse] = useApiData("/calls/numbers", []);
  const numbers = Array.isArray(numbersResponse) ? numbersResponse : numbersResponse.data || [];

  return (
    <Screen title="Calls & IVR" description="Call log, missed-call queue, and tracked numbers.">
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Card className="overflow-hidden">
          <div className="flex gap-1 border-b border-[#E2E5EA] px-4 py-2.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatus(tab.key);
                  setPage(0);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  status === tab.key ? "bg-[#E8EDFF] text-[#2E5BFF]" : "text-[#5B6472] hover:text-[#101418]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Talk time</TableHead>
                  <TableHead>Disposition</TableHead>
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
                {!loading && calls.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      No calls recorded yet.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  calls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-mono-ui text-xs">{formatTime(call.startedAt)}</TableCell>
                      <TableCell>{humanize(call.direction)}</TableCell>
                      <TableCell className="font-semibold text-[#101418]">{call.who}</TableCell>
                      <TableCell>{call.line}</TableCell>
                      <TableCell>{call.agent}</TableCell>
                      <TableCell>
                        <Badge tone={STATUS_TONE[call.status] || "slate"}>{humanize(call.status)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono-ui text-right">{formatTalk(call.talkSeconds)}</TableCell>
                      <TableCell>{call.disposition ? humanize(call.disposition) : "-"}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-[#E2E5EA] px-4 py-2.5 text-xs text-[#5B6472]">
            <span>{total === 0 ? "0" : `${page * take + 1}–${Math.min((page + 1) * take, total)}`} of {total}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((v) => Math.max(0, v - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={(page + 1) * take >= total} onClick={() => setPage((v) => v + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3.5">
          <Card className="p-4.5">
            <div className="text-base font-semibold">Missed-call queue</div>
            <p className="mb-2.5 mt-0.5 text-xs text-[#5B6472]">Calls awaiting a disposition.</p>
            {missed.length === 0 ? (
              <p className="text-sm text-[#5B6472]">Queue is clear.</p>
            ) : (
              missed.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 border-b border-[#EEF0F3] py-2 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold">{item.name}</div>
                    <div className="font-mono-ui text-[11px] text-[#8B93A1]">{item.phone} · {formatTime(item.startedAt)}</div>
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-base font-semibold">Numbers</div>
            {numbers.map((number) => (
              <div key={number.id} className="border-b border-[#EEF0F3] py-2 last:border-b-0">
                <div className="flex justify-between gap-2">
                  <span className="font-mono-ui text-[12.5px] font-semibold">{number.number}</span>
                  {number.missedToday > 0 && (
                    <span className="font-mono-ui text-xs font-semibold text-[#DC2626]">{number.missedToday} missed</span>
                  )}
                </div>
                <div className="text-[11.5px] text-[#8B93A1]">{number.label}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </Screen>
  );
}
