import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { money, moneyCompact } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";

const BUCKET_META = {
  available: { label: "Available", color: "#16A34A" },
  onHold: { label: "On hold", color: "#D97706" },
  blocked: { label: "Blocked", color: "#7C3AED" },
  booked: { label: "Booked", color: "#2E5BFF" },
  registered: { label: "Registered", color: "#0D9488" },
  unavailable: { label: "Unavailable", color: "#C9CED6" },
};

const BLOCK_BAR_ORDER = ["available", "onHold", "blocked", "booked", "registered"];

function bucketForStatus(status) {
  if (status === "AVAILABLE") return "available";
  if (status === "ON_HOLD") return "onHold";
  if (status === "BLOCKED") return "blocked";
  if (status === "BOOKED") return "booked";
  if (["AGREEMENT", "REGISTERED", "POSSESSION"].includes(status)) return "registered";
  return "unavailable";
}

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

const STATUS_TONE = {
  DRAFT: "slate",
  UPCOMING: "blue",
  LAUNCHED: "blue",
  SELLING: "green",
  SOLD_OUT: "violet",
  ON_HOLD: "amber",
  CLOSED: "red",
};

export function InventoryScreen({ navigate }) {
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");

  const [projectsResponse] = useApiData("/projects", { data: [] }, { take: 100 });
  const projects = Array.isArray(projectsResponse) ? projectsResponse : projectsResponse.data || [];
  const activeProjectId = projectId || projects[0]?.id || "";

  const [response, , loading, error] = useApiData(
    "/units/summary",
    { kpis: {}, blocks: [], units: [], project: null, rateCard: null },
    { projectId: activeProjectId },
    { enabled: Boolean(activeProjectId) }
  );

  const { project, kpis = {}, blocks = [], units = [], rateCard } = response;
  const unitsByBlock = new Map();
  for (const unit of units) {
    const list = unitsByBlock.get(unit.blockId) || [];
    list.push(unit);
    unitsByBlock.set(unit.blockId, list);
  }

  function showUnavailable(label) {
    toast.info(`${label} is not connected yet.`);
  }

  return (
    <Screen title="Inventory" description="See a project's units, availability, and block-level breakdown.">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Select className="w-56" value={activeProjectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          {project && <Badge tone={STATUS_TONE[project.status] || "slate"}>{humanize(project.status)}</Badge>}
          {rateCard && (
            <span className="text-[13px] font-medium text-[#5B6472]">
              Rate card v{rateCard.version}
              {rateCard.status !== "PUBLISHED" ? ` (${humanize(rateCard.status)})` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Input
              placeholder="Jump to plot — e.g. A-014"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => showUnavailable("Add units")}>
            + Add units
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Total" value={loading ? "…" : kpis.total ?? 0} meta="units" color="#64748B" />
        <Kpi
          label="Available"
          value={loading ? "…" : kpis.available ?? 0}
          meta={percentMeta(kpis.available, kpis.total)}
          color={BUCKET_META.available.color}
        />
        <Kpi
          label="On hold"
          value={loading ? "…" : kpis.onHold ?? 0}
          meta={percentMeta(kpis.onHold, kpis.total)}
          color={BUCKET_META.onHold.color}
        />
        <Kpi
          label="Blocked"
          value={loading ? "…" : kpis.blocked ?? 0}
          meta={percentMeta(kpis.blocked, kpis.total)}
          color={BUCKET_META.blocked.color}
        />
        <Kpi
          label="Booked"
          value={loading ? "…" : kpis.booked ?? 0}
          meta={percentMeta(kpis.booked, kpis.total)}
          color={BUCKET_META.booked.color}
        />
        <Kpi
          label="Registered"
          value={loading ? "…" : kpis.registered ?? 0}
          meta={percentMeta(kpis.registered, kpis.total)}
          color={BUCKET_META.registered.color}
        />
        <Kpi label="Avg ticket" value={loading ? "…" : moneyCompact(kpis.avgTicket)} title={loading ? "" : money(kpis.avgTicket)} />
        <Kpi
          label="Unsold value"
          value={loading ? "…" : moneyCompact(kpis.unsoldValue)}
          title={loading ? "" : money(kpis.unsoldValue)}
          meta={rateCard ? `at v${rateCard.version}` : ""}
        />
      </div>

      {loading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !activeProjectId ? (
        <Card className="p-8 text-center text-sm text-[#5B6472]">No projects found.</Card>
      ) : (
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          <Card className="overflow-hidden">
            {blocks.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#5B6472]">No blocks found for this project.</p>
            ) : (
              blocks.map((block) => (
                <div key={block.id} className="border-b border-[#EEF0F3] p-4 last:border-b-0">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <h3 className="font-display text-sm font-semibold text-[#101418]">{block.name}</h3>
                    <span className="font-mono-ui text-xs text-[#5B6472]">{block.total} units</span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5">
                    {(unitsByBlock.get(block.id) || []).map((unit) => {
                      const bucket = bucketForStatus(unit.status);
                      const color = BUCKET_META[bucket].color;
                      const matched = !search || unit.unitCode.toLowerCase().includes(search.trim().toLowerCase());
                      return (
                        <div
                          key={unit.id}
                          title={`${unit.unitCode} · ${BUCKET_META[bucket].label}`}
                          className="flex items-center justify-center rounded font-mono-ui text-[10px] text-[#3B4350]"
                          style={{
                            height: 32,
                            background: `${color}22`,
                            boxShadow: `inset 0 0 0 1.5px ${color}88`,
                            opacity: matched ? 1 : 0.25,
                          }}
                        >
                          {unit.number}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </Card>

          <div className="flex flex-col gap-3.5">
            <Card className="p-4">
              <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8B93A1]">Legend</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(BUCKET_META).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 flex-none rounded-sm"
                      style={{ background: `${meta.color}33`, boxShadow: `inset 0 0 0 1.5px ${meta.color}` }}
                    />
                    <span className="flex-1 text-[#5B6472]">{meta.label}</span>
                    <span className="font-mono-ui font-semibold text-[#101418]">{kpis[key] ?? 0}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8B93A1]">Blocks</p>
              {blocks.map((block) => (
                <div key={block.id} className="border-b border-[#EEF0F3] py-2.5 last:border-b-0">
                  <div className="flex justify-between text-[13px] font-semibold">
                    <span>{block.name}</span>
                    <span className="font-mono-ui text-[#5B6472]">{block.total}</span>
                  </div>
                  <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full">
                    {BLOCK_BAR_ORDER.map((key) =>
                      block.total > 0 && block[key] > 0 ? (
                        <div
                          key={key}
                          style={{
                            width: `${(block[key] / block.total) * 100}%`,
                            background: BUCKET_META[key].color,
                          }}
                        />
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}
    </Screen>
  );
}

function Kpi({ label, value, meta, color, title }) {
  return (
    <Card className="min-w-0 p-3.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#5B6472]">
        {color && <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="font-mono-ui mt-1 truncate text-[19px] font-semibold text-[#101418]" title={title}>
        {value}
      </div>
      {meta && <div className="truncate text-[11px] text-[#8B93A1]">{meta}</div>}
    </Card>
  );
}

function percentMeta(count, total) {
  if (!total) return "0%";
  return `${Math.round(((count || 0) / total) * 100)}%`;
}
