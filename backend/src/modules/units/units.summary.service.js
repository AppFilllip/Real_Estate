const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

const ACTIVE_BOOKING_STATUSES = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];

function bucketForUnitStatus(status) {
  if (status === "AVAILABLE") return "available";
  if (status === "ON_HOLD") return "onHold";
  if (status === "BLOCKED") return "blocked";
  if (status === "BOOKED") return "booked";
  if (status === "AGREEMENT" || status === "REGISTERED" || status === "POSSESSION") return "registered";
  return null;
}

class UnitsSummaryService {
  constructor(client = prisma) {
    this.client = client;
  }

  async summary(companyId, projectId) {
    if (!companyId) throw httpError(400, "companyId is required");
    if (!projectId) throw httpError(400, "projectId is required");

    const [project, blocks, units, rateCard, bookingAgg] = await Promise.all([
      this.client.project.findFirst({ where: withNotDeleted({ id: projectId, companyId }) }),
      this.client.block.findMany({ where: withNotDeleted({ companyId, projectId }), orderBy: { sortOrder: "asc" } }),
      this.client.unit.findMany({
        where: withNotDeleted({ companyId, projectId }),
        orderBy: [{ blockId: "asc" }, { number: "asc" }],
      }),
      this.client.rateCard.findFirst({
        where: withNotDeleted({ companyId, projectId }),
        orderBy: { version: "desc" },
      }),
      this.client.booking.aggregate({
        where: withNotDeleted({ companyId, projectId, status: { in: ACTIVE_BOOKING_STATUSES } }),
        _avg: { agreementValue: true },
        _sum: { agreementValue: true },
      }),
    ]);

    if (!project) throw httpError(404, "Project not found");

    const kpis = { total: 0, available: 0, onHold: 0, blocked: 0, booked: 0, registered: 0 };
    const blockStatsById = new Map(
      blocks.map((block) => [block.id, { total: 0, available: 0, onHold: 0, blocked: 0, booked: 0, registered: 0 }])
    );

    let unsoldArea = 0;
    let unsoldUnitCount = 0;
    const unitRows = [];

    for (const unit of units) {
      const bucket = bucketForUnitStatus(unit.status);
      if (bucket) {
        kpis[bucket] += 1;
        kpis.total += 1;
        const blockStats = blockStatsById.get(unit.blockId);
        if (blockStats) {
          blockStats[bucket] += 1;
          blockStats.total += 1;
        }
        if (bucket === "available" || bucket === "onHold") {
          unsoldArea += unit.area || 0;
          unsoldUnitCount += 1;
        }
      }

      unitRows.push({
        id: unit.id,
        unitCode: unit.unitCode,
        number: unit.number,
        blockId: unit.blockId,
        status: unit.status,
        area: unit.area,
        areaUnit: unit.areaUnit,
      });
    }

    const unsoldValue = rateCard
      ? Math.round(
          (rateCard.pricingBasis === "LUMP_SUM" ? unsoldUnitCount : unsoldArea) * Number(rateCard.baseRate)
        )
      : 0;

    return {
      project: { id: project.id, name: project.name, status: project.status, city: project.city },
      rateCard: rateCard ? { version: rateCard.version, status: rateCard.status, baseRate: rateCard.baseRate } : null,
      kpis: {
        ...kpis,
        avgTicket: bookingAgg._avg.agreementValue || 0n,
        soldValue: bookingAgg._sum.agreementValue || 0n,
        unsoldValue,
      },
      blocks: blocks.map((block) => ({
        id: block.id,
        name: block.name,
        code: block.code,
        ...blockStatsById.get(block.id),
      })),
      units: unitRows,
    };
  }
}

module.exports = { UnitsSummaryService };
