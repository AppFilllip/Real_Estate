import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { money } from "../../lib/utils";
import { sendWhatsAppMessage } from "../../lib/whatsapp";
import { sendEmailMessage } from "../../lib/email";
import { placeCall } from "../../lib/calling";

const STAGE_ORDER = ["NEW", "CONTACTED", "QUALIFIED", "VISIT_SCHEDULED", "VISIT_DONE", "NEGOTIATION", "TOKEN", "BOOKED"];
const STAGE_TONE = {
  NEW: "blue",
  CONTACTED: "amber",
  QUALIFIED: "green",
  VISIT_SCHEDULED: "amber",
  VISIT_DONE: "green",
  NEGOTIATION: "violet",
  TOKEN: "violet",
  BOOKED: "green",
  LOST: "red",
};

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LeadDetailScreen({ id, navigate, onBack }) {
  const [note, setNote] = useState("");

  const [lead, , leadLoading, leadError, reloadLead] = useApiData(`/leads/${id}`, null);
  const [timelineResponse, , , , reloadTimeline] = useApiData(`/leads/${id}/timeline`, { data: [] });
  const timeline = Array.isArray(timelineResponse) ? timelineResponse : timelineResponse.data || [];
  const [tasksResponse] = useApiData(`/leads/${id}/tasks`, { data: [] });
  const tasks = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse.data || [];
  const [costSheetsResponse] = useApiData("/cost-sheets", { data: [] }, { leadId: id });
  const costSheets = Array.isArray(costSheetsResponse) ? costSheetsResponse : costSheetsResponse.data || [];


  async function saveNote() {
    if (!note.trim()) return;
    try {
      await api.post(`/leads/${id}/notes`, { body: note.trim() });
      setNote("");
      reloadTimeline();
      toast.success("Note saved.");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not save note.");
    }
  }

  async function advanceStage() {
    if (!lead) return;
    const index = STAGE_ORDER.indexOf(lead.stage);
    const next = index >= 0 ? STAGE_ORDER[index + 1] : null;
    if (!next) return;
    try {
      await api.patch(`/leads/${id}/stage`, { stage: next });
      reloadLead();
      reloadTimeline();
      toast.success("Stage updated.");
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not change stage.");
    }
  }

  if (leadLoading) {
    return (
      <div className="mx-auto max-w-[1440px] space-y-4 p-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (leadError || !lead) return <div className="mx-auto max-w-[1440px] p-5 text-sm text-red-600">{leadError || "Lead not found."}</div>;

  const nextTask = tasks.find((task) => task.status === "OPEN");
  const scoreBreakdown = Object.entries(lead.scoreBreakdownJson || {});

  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onBack} className="border-0 bg-transparent p-0 text-xs font-semibold text-[#2E5BFF]">
          Leads
        </button>
        <span className="text-xs text-[#8B93A1]">/ {lead.name}</span>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4.5">
        <h1 className="font-display m-0 text-2xl font-semibold text-[#101418]">{lead.name}</h1>
        <Badge tone={STAGE_TONE[lead.stage] || "slate"}>{humanize(lead.stage)}</Badge>
        <span className="font-mono-ui rounded-md bg-[#E6F6EC] px-2 py-1 text-xs font-semibold text-[#16A34A]">{lead.score} / 100</span>
        {lead.owner && (
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#5B6472]">
            <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#E8EDFF] text-[10px] font-bold text-[#2E5BFF]">
              {lead.owner.name?.slice(0, 2).toUpperCase()}
            </span>
            {lead.owner.name}
          </span>
        )}
        <div className="flex-1" />
        <div className="flex gap-1.5">
          <Button onClick={() => placeCall({ leadId: lead.id })}>Call</Button>
          <Button variant="secondary" onClick={() => sendWhatsAppMessage({ leadId: lead.id, label: lead.name })}>
            WhatsApp
          </Button>
          <Button variant="secondary" onClick={() => sendEmailMessage({ leadId: lead.id, label: lead.name })}>
            Email
          </Button>
          <Button variant="secondary" disabled={!STAGE_ORDER.includes(lead.stage) || STAGE_ORDER.indexOf(lead.stage) === STAGE_ORDER.length - 1} onClick={advanceStage}>
            Advance stage
          </Button>
        </div>
      </Card>

      <div className="grid gap-3.5 lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:items-start">
        <div className="flex flex-col gap-3">
          <InfoCard label="Contact">
            <div className="font-mono-ui text-[13px] font-semibold">{lead.phone}</div>
            <div className="mt-1 text-[12.5px] text-[#5B6472]">{lead.email || "-"}</div>
            <div className="mt-0.5 text-[12.5px] text-[#5B6472]">
              {[lead.city, lead.languagePreference].filter(Boolean).join(" · ")}
            </div>
          </InfoCard>

          <InfoCard label="Requirement">
            {lead.requirement ? (
              <div className="flex flex-col gap-1 text-[12.5px]">
                {lead.requirement.budgetMin != null && (
                  <Row k="Budget" v={`${money(lead.requirement.budgetMin)} – ${money(lead.requirement.budgetMax)}`} />
                )}
                {lead.requirement.areaMin != null && <Row k="Area" v={`${lead.requirement.areaMin} – ${lead.requirement.areaMax}`} />}
                {lead.requirement.timeline && <Row k="Timeline" v={humanize(lead.requirement.timeline)} />}
                {lead.requirement.purpose && <Row k="Purpose" v={humanize(lead.requirement.purpose)} />}
              </div>
            ) : (
              <p className="text-[12.5px] text-[#8B93A1]">No requirement captured yet.</p>
            )}
          </InfoCard>

          <InfoCard label="Shortlisted units">
            <div className="flex flex-wrap gap-1.5">
              {(lead.shortlists || []).length === 0 && <p className="text-[12.5px] text-[#8B93A1]">None yet.</p>}
              {(lead.shortlists || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate?.("/inventory")}
                  className="h-[30px] rounded-md border border-[#E2E5EA] bg-white px-2.5 font-mono-ui text-[11.5px] font-semibold text-[#2E5BFF]"
                >
                  {item.unit?.unitCode}
                </button>
              ))}
            </div>
          </InfoCard>

          <InfoCard label="Source">
            <div className="text-[12.5px] leading-[19px] text-[#5B6472]">
              {lead.source?.name || "Direct"}
              {lead.campaign && (
                <>
                  {" "}
                  › <strong className="text-[#101418]">{lead.campaign.name}</strong>
                </>
              )}
              <br />
              {lead.firstTouchAt && <>First touch {formatDateTime(lead.firstTouchAt)}</>}
            </div>
          </InfoCard>
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-[#E2E5EA] p-4">
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note…"
              className="h-16 w-full resize-none rounded-md border border-[#E2E5EA] px-3 py-2.5 text-[13px] outline-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" onClick={saveNote}>
                Save note
              </Button>
            </div>
          </div>
          <div className="p-4.5">
            {timeline.length === 0 ? (
              <p className="text-sm text-[#5B6472]">No activity yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {timeline.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[#2E5BFF]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{humanize(entry.type)}</div>
                      <div className="mt-0.5 text-[13px] text-[#5B6472]">{entry.summary}</div>
                      <div className="font-mono-ui mt-1 text-[11px] text-[#8B93A1]">{formatDateTime(entry.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {nextTask && (
            <InfoCard label="Next follow-up" accent="#D97706">
              <div className="text-sm font-semibold">
                {formatDateTime(nextTask.dueAt)} · {humanize(nextTask.type)}
              </div>
              {nextTask.note && <div className="mt-1 text-[12.5px] text-[#5B6472]">{nextTask.note}</div>}
            </InfoCard>
          )}

          <InfoCard label="Cost sheets">
            {costSheets.length === 0 ? (
              <p className="text-[12.5px] text-[#8B93A1]">None yet.</p>
            ) : (
              costSheets.map((sheet) => (
                <div key={sheet.id} className="flex items-center justify-between border-b border-[#EEF0F3] py-2 last:border-b-0">
                  <div>
                    <div className="font-mono-ui text-[12.5px] font-semibold">{sheet.costSheetNumber || sheet.id.slice(-6)}</div>
                    <div className="text-[11.5px] text-[#8B93A1]">{money(sheet.totalCost)}</div>
                  </div>
                </div>
              ))
            )}
          </InfoCard>

          {scoreBreakdown.length > 0 && (
            <InfoCard label="Score breakdown">
              {scoreBreakdown.map(([key, value]) => (
                <div key={key} className="mb-2 last:mb-0">
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="text-[#5B6472]">{humanize(key)}</span>
                    <span className="font-mono-ui font-semibold">{value > 0 ? `+${value}` : value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-[#EEF0F3]">
                    <div
                      className={value >= 0 ? "h-full bg-[#16A34A]" : "h-full bg-[#DC2626]"}
                      style={{ width: `${Math.min(100, Math.abs(value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </InfoCard>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoCard({ label, accent, children }) {
  return (
    <Card className="p-4" style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-[#8B93A1]">{label}</p>
      {children}
    </Card>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#8B93A1]">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
