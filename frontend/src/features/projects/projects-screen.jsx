import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Dialog } from "../../components/ui/dialog";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { cn, money, moneyCompact } from "../../lib/utils";
import { Screen } from "../dashboard/dashboard-screen";

function resolveFileUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
  return `${origin}${url}`;
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

const BAR_SEGMENTS = [
  { key: "available", label: "Available", color: "#CBD5E1" },
  { key: "onHold", label: "On hold", color: "#F59E0B" },
  { key: "booked", label: "Booked", color: "#2E5BFF" },
  { key: "registered", label: "Registered", color: "#16A34A" },
];

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProjectsScreen({ navigate }) {
  const [response, , loading, error, reload] = useApiData("/projects/summary", { kpis: {}, projects: [] });
  const kpis = response.kpis || {};
  const projects = response.projects || [];
  const [rateCardProject, setRateCardProject] = useState(null);
  const [collateralProject, setCollateralProject] = useState(null);

  return (
    <Screen title="Projects" description="Track live projects, inventory, pricing, and sales progress.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Live projects" value={loading ? "…" : kpis.liveProjects ?? 0} />
        <Kpi label="Total inventory" value={loading ? "…" : `${kpis.totalUnits ?? 0} units`} sub={loading ? "" : `${kpis.totalBlocks ?? 0} phases`} />
        <Kpi label="Sold value" value={loading ? "…" : moneyCompact(kpis.soldValue)} title={loading ? "" : money(kpis.soldValue)} />
        <Kpi
          label="Unsold value"
          value={loading ? "…" : moneyCompact(kpis.unsoldValue)}
          title={loading ? "" : money(kpis.unsoldValue)}
          sub="at current rate cards"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[#5B6472]">No projects found.</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              navigate={navigate}
              onOpenRateCard={() => setRateCardProject(project)}
              onOpenCollateral={() => setCollateralProject(project)}
            />
          ))}
        </div>
      )}

      {rateCardProject && <RateCardDialog project={rateCardProject} onClose={() => setRateCardProject(null)} />}
      {collateralProject && (
        <CollateralDialog
          project={collateralProject}
          onClose={() => setCollateralProject(null)}
          onUploaded={reload}
        />
      )}
    </Screen>
  );
}

function Kpi({ label, value, sub, title }) {
  return (
    <Card className="min-w-0 p-4">
      <p className="text-[12px] font-medium text-[#5B6472]">{label}</p>
      <div className="font-mono-ui mt-2 truncate text-[22px] font-semibold tracking-normal text-[#101418]" title={title}>
        {value}
      </div>
      {sub && <p className="mt-0.5 truncate text-[12px] text-[#8B93A1]">{sub}</p>}
    </Card>
  );
}

function ProjectCard({ project, navigate, onOpenRateCard, onOpenCollateral }) {
  const total = project.totalUnits || 0;
  const segments = BAR_SEGMENTS.map((segment) => ({
    ...segment,
    percent: total > 0 ? Math.round(((project[segment.key] || 0) / total) * 100) : 0,
  }));
  const rateCardLabel = project.rateCard
    ? project.rateCard.status === "PUBLISHED"
      ? `v${project.rateCard.version}`
      : "draft"
    : "—";

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold leading-tight text-[#101418]">{project.name}</h3>
          <p className="mt-0.5 text-[12.5px] text-[#5B6472]">
            {[project.city, humanize(project.type), project.reraNumber].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge tone={STATUS_TONE[project.status] || "slate"}>{humanize(project.status)}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[12.5px]">
        <div>
          <p className="text-[#8B93A1]">Sold</p>
          <p className="font-mono-ui mt-0.5 font-semibold text-[#101418]">{project.soldPercent}%</p>
        </div>
        <div>
          <p className="text-[#8B93A1]">Base rate</p>
          <p className="font-mono-ui mt-0.5 font-semibold text-[#101418]">
            {project.rateCard ? `${money(project.rateCard.baseRate)} ${project.rateCard.pricingSuffix}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[#8B93A1]">Rate card</p>
          <p className="font-mono-ui mt-0.5 font-semibold text-[#101418]">{rateCardLabel}</p>
        </div>
      </div>

      <div>
        <div className="flex h-2 overflow-hidden rounded-full bg-[#EEF0F3]">
          {segments.map((segment) =>
            segment.percent > 0 ? (
              <div key={segment.key} style={{ width: `${segment.percent}%`, backgroundColor: segment.color }} />
            ) : null
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#5B6472]">
          {segments.map((segment) => (
            <span key={segment.key} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label} {segment.percent}%
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => navigate?.("/inventory")}>
          Inventory
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenRateCard}>
          Rate card
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenCollateral}>
          Collateral
        </Button>
      </div>
    </Card>
  );
}

function pricingSuffix(basis) {
  if (basis === "PER_SQ_FT") return "/ sq ft";
  if (basis === "PER_SQ_YD") return "/ sq yd";
  return "";
}

function RateCardDialog({ project, onClose }) {
  const [versionsResponse, , loading] = useApiData("/rate-cards", { data: [] }, { projectId: project.id, take: 10 });
  const versions = [...(Array.isArray(versionsResponse) ? versionsResponse : versionsResponse.data || [])].sort(
    (a, b) => b.version - a.version
  );
  const [selectedId, setSelectedId] = useState(null);
  const selected = versions.find((v) => v.id === selectedId) || versions[0];

  const [chargesResponse, , chargesLoading] = useApiData(
    "/rate-card-charges",
    { data: [] },
    { rateCardId: selected?.id, take: 50 },
    { enabled: Boolean(selected?.id) }
  );
  const charges = [...(Array.isArray(chargesResponse) ? chargesResponse : chargesResponse.data || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  const suffix = selected ? pricingSuffix(selected.pricingBasis) : "";

  return (
    <Dialog
      open
      title={`Rate card — ${project.name}`}
      description="Base pricing, statutory percentages, and add-on charges."
      onClose={onClose}
      className="max-w-2xl"
    >
      {loading ? (
        <Skeleton className="h-48 w-full rounded-md" />
      ) : versions.length === 0 ? (
        <p className="text-sm text-[#5B6472]">No rate card has been created for this project yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[12.5px] font-semibold transition-colors",
                  (selected?.id ?? versions[0].id) === v.id
                    ? "border-[#2E5BFF] bg-[#E8EDFF] text-[#2E5BFF]"
                    : "border-[#E2E5EA] bg-white text-[#5B6472] hover:bg-[#F1F3F6]"
                )}
              >
                v{v.version} · {humanize(v.status)}
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InfoField label="Base rate" value={`${money(selected.baseRate)}${suffix ? ` ${suffix}` : ""}`} />
                <InfoField label="Pricing basis" value={humanize(selected.pricingBasis)} />
                <InfoField label="Status" value={humanize(selected.status)} />
                <InfoField label="Stamp duty (male)" value={`${selected.stampDutyMalePct}%`} />
                <InfoField label="Stamp duty (female)" value={`${selected.stampDutyFemalePct}%`} />
                <InfoField label="Registration" value={`${selected.registrationPct}%`} />
                <InfoField
                  label="Effective from"
                  value={selected.effectiveFrom ? new Date(selected.effectiveFrom).toLocaleDateString("en-IN") : "—"}
                />
                <InfoField
                  label="Published at"
                  value={selected.publishedAt ? new Date(selected.publishedAt).toLocaleDateString("en-IN") : "Not published"}
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">Charges &amp; add-ons</p>
                {chargesLoading ? (
                  <Skeleton className="h-24 w-full rounded-md" />
                ) : charges.length === 0 ? (
                  <p className="text-sm text-[#5B6472]">No additional charges on this rate card.</p>
                ) : (
                  <Card className="overflow-hidden">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-[#F5F6F8] text-left text-[11px] font-bold uppercase tracking-wide text-[#8B93A1]">
                          <th className="px-3 py-2">Charge</th>
                          <th className="px-3 py-2">Basis</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-right">GST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {charges.map((charge) => (
                          <tr key={charge.id} className="border-t border-[#EEF0F3]">
                            <td className="px-3 py-2 font-medium text-[#101418]">{charge.name}</td>
                            <td className="px-3 py-2 text-[#5B6472]">{humanize(charge.basis)}</td>
                            <td className="font-mono-ui px-3 py-2 text-right">
                              {charge.basis === "PERCENT"
                                ? `${charge.amount}%`
                                : `${money(charge.amount)}${charge.basis === "PER_AREA" ? ` ${suffix}` : ""}`}
                            </td>
                            <td className="px-3 py-2 text-right text-[#5B6472]">{charge.taxable ? `${charge.gstPct ?? 0}%` : "Exempt"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B93A1]">{label}</p>
      <p className="mt-0.5 text-[13.5px] font-semibold text-[#101418]">{value}</p>
    </div>
  );
}

const COLLATERAL_ITEMS = [
  { key: "coverImageUrl", label: "Cover image", hint: "A hero image used on brochures and listing sites" },
  { key: "brochureUrl", label: "Brochure", hint: "PDF or link to the project's sales brochure" },
  { key: "layoutPlanUrl", label: "Layout plan", hint: "Master layout / site plan document" },
];

function CollateralDialog({ project, onClose, onUploaded }) {
  const [record, setRecord] = useState(project);
  const [busyKey, setBusyKey] = useState(null);
  const fileInputRefs = useRef({});

  async function handleFileChange(item, file) {
    if (!file) return;
    setBusyKey(item.key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/uploads", formData);
      const url = uploadRes.data.data.url;

      await api.patch(`/projects/${project.id}`, { [item.key]: url });

      setRecord((current) => ({ ...current, [item.key]: url }));
      onUploaded?.();
      toast.success(`${item.label} uploaded.`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Could not upload ${item.label}.`);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Dialog
      open
      title={`Collateral — ${record.name}`}
      description="Marketing assets for this project."
      onClose={onClose}
      className="max-w-lg"
    >
      <div className="space-y-4">
        {COLLATERAL_ITEMS.map((item) => {
          const existingUrl = record[item.key];
          const busy = busyKey === item.key;
          return (
            <div key={item.key} className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#101418]">{item.label}</label>
              <div className="flex items-center gap-2 rounded-md border border-[#E2E5EA] bg-[#F5F6F8] px-3 py-2">
                <span className={cn("flex-1 truncate text-[13px]", existingUrl ? "text-[#101418]" : "text-[#8B93A1]")}>
                  {existingUrl || "Not uploaded yet"}
                </span>
                {existingUrl && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(resolveFileUrl(existingUrl), "_blank", "noopener,noreferrer")}
                  >
                    Open
                  </Button>
                )}
                <input
                  ref={(el) => (fileInputRefs.current[item.key] = el)}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => handleFileChange(item, event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => fileInputRefs.current[item.key]?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {busy ? "Uploading…" : "Upload"}
                </Button>
              </div>
              <p className="text-[11.5px] text-[#8B93A1]">{item.hint}</p>
            </div>
          );
        })}
        <div className="flex justify-end border-t border-[#EEF0F3] pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
