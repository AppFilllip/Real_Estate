const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

const ACTIVE_BOOKING_STATUSES = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];
const PENDING_COMMISSION_STATUSES = ["ACCRUED", "INVOICED", "APPROVED"];

class BrokersSummaryService {
  constructor(client = prisma) {
    this.client = client;
  }

  async list({ companyId, skip = 0, take = 25 }) {
    if (!companyId) throw httpError(400, "companyId is required");

    const [brokers, total] = await Promise.all([
      this.client.broker.findMany({ where: withNotDeleted({ companyId }), orderBy: { createdAt: "desc" }, skip, take }),
      this.client.broker.count({ where: withNotDeleted({ companyId }) }),
    ]);

    const ids = brokers.map((broker) => broker.id);
    const [leadCounts, visitCounts, bookingCounts, commissionSums] = ids.length
      ? await Promise.all([
          this.client.lead.groupBy({ by: ["brokerId"], where: { companyId, brokerId: { in: ids } }, _count: { _all: true } }),
          this.client.siteVisit.groupBy({ by: ["brokerId"], where: { companyId, brokerId: { in: ids } }, _count: { _all: true } }),
          this.client.booking.groupBy({
            by: ["brokerId"],
            where: { companyId, brokerId: { in: ids }, status: { in: ACTIVE_BOOKING_STATUSES } },
            _count: { _all: true },
          }),
          this.client.commission.groupBy({
            by: ["brokerId"],
            where: { companyId, brokerId: { in: ids }, status: { in: PENDING_COMMISSION_STATUSES } },
            _sum: { amount: true },
          }),
        ])
      : [[], [], [], []];

    const leadsMap = new Map(leadCounts.map((row) => [row.brokerId, row._count._all]));
    const visitsMap = new Map(visitCounts.map((row) => [row.brokerId, row._count._all]));
    const bookingsMap = new Map(bookingCounts.map((row) => [row.brokerId, row._count._all]));
    const commissionMap = new Map(commissionSums.map((row) => [row.brokerId, row._sum.amount || 0n]));

    const data = brokers.map((broker) => ({
      id: broker.id,
      firmName: broker.firmName,
      contactPerson: broker.contactPerson,
      tier: broker.tier,
      status: broker.status,
      leads: leadsMap.get(broker.id) || 0,
      visits: visitsMap.get(broker.id) || 0,
      bookings: bookingsMap.get(broker.id) || 0,
      pendingCommission: commissionMap.get(broker.id) || 0n,
    }));

    return { data, total };
  }
}

module.exports = { BrokersSummaryService };
