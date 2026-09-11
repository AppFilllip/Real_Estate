const { ReportsRepository } = require("./reports.repository");
const { httpError } = require("../../utils/http-error");
const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

const ACTIVE_BOOKING_STATUSES_FOR_EXEC = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];

const ACTIVE_BOOKING_STATUSES = ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"];
const OPEN_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"];
const OUTSTANDING_DEMAND_STATUSES = ["DUE", "OVERDUE", "PARTIAL"];

function parseDate(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, `Invalid date: ${value}`);
  }
  return date;
}

function startOfToday(now = new Date()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday(now = new Date()) {
  const date = new Date(now);
  date.setHours(23, 59, 59, 999);
  return date;
}

function dateRange(query = {}) {
  const from = parseDate(query.from);
  const to = parseDate(query.to);

  if (from && to && from > to) {
    throw httpError(400, "from date must be before to date");
  }

  return { from, to };
}

function createdAtFilter(range) {
  if (!range.from && !range.to) return {};
  return {
    createdAt: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function bookedOnFilter(range) {
  if (!range.from && !range.to) return {};
  return {
    bookedOn: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function groupRows(rows, keyName) {
  return rows.map((row) => ({
    [keyName]: row[keyName],
    count: row._count._all,
    amount: row._sum ? row._sum.agreementValue || 0n : undefined,
  }));
}

class ReportsService {
  constructor(repository = new ReportsRepository(), now = () => new Date()) {
    this.repository = repository;
    this.now = now;
  }

  requireCompanyId(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    return query.companyId;
  }

  async dashboard(query) {
    const companyId = this.requireCompanyId(query);
    const todayStart = startOfToday(this.now());
    const todayEnd = endOfToday(this.now());
    const base = withNotDeleted({ companyId });

    const [
      totalLeads,
      newLeadsToday,
      siteVisitsToday,
      activeBookings,
      salesValue,
      collectionDue,
      openTickets,
      pendingApprovals,
      commissionPayable,
    ] = await Promise.all([
      this.repository.count("lead", base),
      this.repository.count("lead", withNotDeleted({ companyId, createdAt: { gte: todayStart, lte: todayEnd } })),
      this.repository.count(
        "siteVisit",
        withNotDeleted({
          companyId,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
          scheduledAt: { gte: todayStart, lte: todayEnd },
        })
      ),
      this.repository.count(
        "booking",
        withNotDeleted({
          companyId,
          status: { in: ACTIVE_BOOKING_STATUSES },
        })
      ),
      this.repository.sum(
        "booking",
        "agreementValue",
        withNotDeleted({
          companyId,
          status: { in: ACTIVE_BOOKING_STATUSES },
        })
      ),
      this.repository.sum(
        "demand",
        "amount",
        withNotDeleted({
          companyId,
          status: { in: OUTSTANDING_DEMAND_STATUSES },
        })
      ),
      this.repository.count(
        "ticket",
        withNotDeleted({
          companyId,
          status: { in: OPEN_TICKET_STATUSES },
        })
      ),
      this.repository.count("approvalRequest", { companyId, status: "PENDING" }),
      this.repository.sum("commission", "amount", {
        companyId,
        status: { in: ["ACCRUED", "APPROVED"] },
      }),
    ]);

    return {
      cards: {
        totalLeads,
        newLeadsToday,
        siteVisitsToday,
        activeBookings,
        salesValue: salesValue._sum.agreementValue || 0n,
        collectionDue: collectionDue._sum.amount || 0n,
        openTickets,
        pendingApprovals,
        commissionPayable: commissionPayable._sum.amount || 0n,
      },
    };
  }

  async leads(query) {
    const companyId = this.requireCompanyId(query);
    const range = dateRange(query);
    const where = withNotDeleted({ companyId, ...createdAtFilter(range) });
    const [byStage, byTemperature, byOwner, byLostReason, bySourceMap] = await Promise.all([
      this.repository.groupCount("lead", "stage", where),
      this.repository.groupCount("lead", "temperature", where),
      this.repository.groupCount("lead", "ownerId", where),
      this.repository.groupCount("lead", "lostReason", { ...where, lostReason: { not: null } }),
      this.repository.leadsBySource(where),
    ]);

    return {
      byStage: groupRows(byStage, "stage"),
      byTemperature: groupRows(byTemperature, "temperature"),
      byOwner: groupRows(byOwner, "ownerId"),
      byLostReason: groupRows(byLostReason, "lostReason"),
      bySource: Array.from(bySourceMap.values()),
    };
  }

  async inventory(query) {
    const companyId = this.requireCompanyId(query);
    const where = withNotDeleted({
      companyId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
    });

    const [byStatus, byProject] = await Promise.all([
      this.repository.groupCount("unit", "status", where),
      this.repository.groupCount("unit", "projectId", where),
    ]);

    return {
      byStatus: groupRows(byStatus, "status"),
      byProject: groupRows(byProject, "projectId"),
    };
  }

  async sales(query) {
    const companyId = this.requireCompanyId(query);
    const range = dateRange(query);
    const where = withNotDeleted({
      companyId,
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...bookedOnFilter(range),
    });

    const [byProject, bySalesExec, byBroker, tokensConverted] = await Promise.all([
      this.repository.groupBookingSales("projectId", where),
      this.repository.groupBookingSales("salesExecId", where),
      this.repository.groupBookingSales("brokerId", { ...where, brokerId: { not: null } }),
      // Token has no deletedAt column — filtering on it makes Prisma reject the query.
      this.repository.count("token", { companyId, status: "CONVERTED" }),
    ]);

    return {
      byProject: groupRows(byProject, "projectId"),
      bySalesExec: groupRows(bySalesExec, "salesExecId"),
      byBroker: groupRows(byBroker, "brokerId"),
      tokensConverted,
    };
  }

  async collections(query) {
    const companyId = this.requireCompanyId(query);
    const range = dateRange(query);
    const [demandsRaised, received, overdue] = await Promise.all([
      this.repository.sum(
        "demand",
        "amount",
        withNotDeleted({
          companyId,
          ...createdAtFilter(range),
        })
      ),
      this.repository.sum(
        "receipt",
        "amount",
        withNotDeleted({
          companyId,
          status: { in: ["RECORDED", "PENDING_CLEARANCE", "CLEARED"] },
          ...createdAtFilter(range),
        })
      ),
      this.repository.sum(
        "demand",
        "amount",
        withNotDeleted({
          companyId,
          status: "OVERDUE",
        })
      ),
    ]);

    return {
      demandsRaised: demandsRaised._sum.amount || 0n,
      received: received._sum.amount || 0n,
      overdue: overdue._sum.amount || 0n,
    };
  }

  async execPerformance(query) {
    const companyId = this.requireCompanyId(query);

    const execs = await prisma.user.findMany({
      where: withNotDeleted({ companyId, role: { code: "SALES_EXEC" } }),
      select: { id: true, name: true, targetsJson: true },
    });
    const execIds = execs.map((exec) => exec.id);
    if (!execIds.length) return { rows: [] };

    const [leadCounts, callCounts, visitCounts, bookings] = await Promise.all([
      prisma.lead.groupBy({ by: ["ownerId"], where: withNotDeleted({ companyId, ownerId: { in: execIds } }), _count: { _all: true } }),
      prisma.call.groupBy({ by: ["agentId"], where: { companyId, agentId: { in: execIds } }, _count: { _all: true } }),
      prisma.siteVisit.groupBy({ by: ["execId"], where: withNotDeleted({ companyId, execId: { in: execIds } }), _count: { _all: true } }),
      prisma.booking.groupBy({
        by: ["salesExecId"],
        where: withNotDeleted({ companyId, salesExecId: { in: execIds }, status: { in: ACTIVE_BOOKING_STATUSES_FOR_EXEC } }),
        _count: { _all: true },
        _sum: { agreementValue: true },
      }),
    ]);

    const leadsMap = new Map(leadCounts.map((row) => [row.ownerId, row._count._all]));
    const callsMap = new Map(callCounts.map((row) => [row.agentId, row._count._all]));
    const visitsMap = new Map(visitCounts.map((row) => [row.execId, row._count._all]));
    const bookingsMap = new Map(bookings.map((row) => [row.salesExecId, row._count._all]));
    const valueMap = new Map(bookings.map((row) => [row.salesExecId, row._sum.agreementValue || 0n]));

    const rows = execs
      .map((exec) => {
        const bookingCount = bookingsMap.get(exec.id) || 0;
        const target = exec.targetsJson?.bookings || 0;
        return {
          id: exec.id,
          name: exec.name,
          leads: leadsMap.get(exec.id) || 0,
          calls: callsMap.get(exec.id) || 0,
          visits: visitsMap.get(exec.id) || 0,
          bookings: bookingCount,
          value: valueMap.get(exec.id) || 0n,
          target,
          targetPercent: target > 0 ? Math.min(100, Math.round((bookingCount / target) * 100)) : 0,
        };
      })
      .sort((a, b) => b.bookings - a.bookings);

    return { rows };
  }

  async stageConversion(query) {
    const companyId = this.requireCompanyId(query);
    const byStage = await this.repository.groupCount("lead", "stage", withNotDeleted({ companyId }));
    const total = byStage.reduce((sum, row) => sum + row._count._all, 0);
    return groupRows(byStage, "stage")
      .map((row) => ({ ...row, percent: total > 0 ? Math.round((row.count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);
  }

  async brokers(query) {
    const companyId = this.requireCompanyId(query);
    const [byStatus, brokerLeads, brokerBookings, commissionsByStatus] = await Promise.all([
      this.repository.groupCount("broker", "status", withNotDeleted({ companyId })),
      this.repository.count("lead", withNotDeleted({ companyId, brokerId: { not: null } })),
      this.repository.count("booking", withNotDeleted({ companyId, brokerId: { not: null } })),
      this.repository.groupCount("commission", "status", { companyId }),
    ]);

    return {
      byStatus: groupRows(byStatus, "status"),
      brokerLeads,
      brokerBookings,
      commissionsByStatus: groupRows(commissionsByStatus, "status"),
    };
  }
}

module.exports = { ReportsService };
