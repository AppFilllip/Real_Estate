const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

const ACTIVE_BOOKING_STATUSES = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];
const LIVE_PROJECT_STATUSES = ["UPCOMING", "LAUNCHED", "SELLING"];

function bucketForUnitStatus(status) {
  if (status === "AVAILABLE") return "available";
  if (status === "ON_HOLD" || status === "BLOCKED") return "onHold";
  if (status === "BOOKED") return "booked";
  if (status === "AGREEMENT" || status === "REGISTERED" || status === "POSSESSION") return "registered";
  return null;
}

function pricingSuffix(pricingBasis) {
  if (pricingBasis === "PER_SQ_FT") return "/ sq ft";
  if (pricingBasis === "PER_SQ_YD") return "/ sq yd";
  return "";
}

class ProjectsSummaryService {
  constructor(client = prisma) {
    this.client = client;
  }

  async summary(companyId) {
    if (!companyId) throw httpError(400, "companyId is required");

    const [projects, units, rateCards, bookingSums, blockCount] = await Promise.all([
      this.client.project.findMany({ where: withNotDeleted({ companyId }), orderBy: { createdAt: "desc" } }),
      this.client.unit.findMany({
        where: withNotDeleted({ companyId }),
        select: { projectId: true, status: true, area: true },
      }),
      this.client.rateCard.findMany({
        where: withNotDeleted({ companyId }),
        orderBy: { version: "desc" },
      }),
      this.client.booking.groupBy({
        by: ["projectId"],
        where: withNotDeleted({ companyId, status: { in: ACTIVE_BOOKING_STATUSES } }),
        _sum: { agreementValue: true },
      }),
      this.client.block.count({ where: withNotDeleted({ companyId }) }),
    ]);

    const unitsByProject = new Map();
    for (const unit of units) {
      const bucket = bucketForUnitStatus(unit.status);
      if (!bucket) continue;
      const entry = unitsByProject.get(unit.projectId) || {
        available: 0,
        onHold: 0,
        booked: 0,
        registered: 0,
        unsoldArea: 0,
      };
      entry[bucket] += 1;
      if (bucket === "available" || bucket === "onHold") entry.unsoldArea += unit.area || 0;
      unitsByProject.set(unit.projectId, entry);
    }

    const latestRateCardByProject = new Map();
    for (const rateCard of rateCards) {
      if (!latestRateCardByProject.has(rateCard.projectId)) {
        latestRateCardByProject.set(rateCard.projectId, rateCard);
      }
    }

    const soldValueByProject = new Map();
    for (const row of bookingSums) {
      soldValueByProject.set(row.projectId, row._sum.agreementValue || 0n);
    }

    let totalUnits = 0;
    let totalSoldValue = 0n;
    let totalUnsoldValue = 0;
    let liveProjects = 0;

    const projectCards = projects.map((project) => {
      const stats = unitsByProject.get(project.id) || {
        available: 0,
        onHold: 0,
        booked: 0,
        registered: 0,
        unsoldArea: 0,
      };
      const sellable = stats.available + stats.onHold + stats.booked + stats.registered;
      const soldPercent = sellable > 0 ? Math.round(((stats.booked + stats.registered) / sellable) * 100) : 0;
      const rateCard = latestRateCardByProject.get(project.id) || null;
      const soldValue = soldValueByProject.get(project.id) || 0n;
      const unsoldUnitCount = stats.available + stats.onHold;
      const unsoldValue = rateCard
        ? Math.round(
            (rateCard.pricingBasis === "LUMP_SUM" ? unsoldUnitCount : stats.unsoldArea) * Number(rateCard.baseRate)
          )
        : 0;

      totalUnits += sellable;
      totalSoldValue += soldValue;
      totalUnsoldValue += unsoldValue;
      if (LIVE_PROJECT_STATUSES.includes(project.status)) liveProjects += 1;

      return {
        id: project.id,
        name: project.name,
        shortCode: project.shortCode,
        city: project.city,
        type: project.type,
        status: project.status,
        reraNumber: project.reraNumber,
        coverImageUrl: project.coverImageUrl,
        brochureUrl: project.brochureUrl,
        layoutPlanUrl: project.layoutPlanUrl,
        totalUnits: sellable,
        available: stats.available,
        onHold: stats.onHold,
        booked: stats.booked,
        registered: stats.registered,
        soldPercent,
        soldValue,
        rateCard: rateCard
          ? {
              version: rateCard.version,
              status: rateCard.status,
              baseRate: rateCard.baseRate,
              pricingSuffix: pricingSuffix(rateCard.pricingBasis),
            }
          : null,
      };
    });

    return {
      kpis: {
        liveProjects,
        totalProjects: projects.length,
        totalUnits,
        totalBlocks: blockCount,
        soldValue: totalSoldValue,
        unsoldValue: totalUnsoldValue,
      },
      projects: projectCards,
    };
  }
}

module.exports = { ProjectsSummaryService };
