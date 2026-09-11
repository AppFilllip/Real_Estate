const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

class CallsSummaryService {
  constructor(client = prisma) {
    this.client = client;
  }

  async list({ companyId, status, skip = 0, take = 25 }) {
    if (!companyId) throw httpError(400, "companyId is required");

    const where = { companyId, ...(status ? { status } : {}) };
    const [calls, total] = await Promise.all([
      this.client.call.findMany({
        where,
        skip,
        take,
        orderBy: { startedAt: "desc" },
        include: {
          lead: { select: { name: true } },
          customer: { select: { name: true } },
          agent: { select: { name: true } },
          phoneNumber: { select: { label: true } },
        },
      }),
      this.client.call.count({ where }),
    ]);

    const data = calls.map((call) => ({
      id: call.id,
      startedAt: call.startedAt,
      direction: call.direction,
      who: call.lead?.name || call.customer?.name || call.fromNumber,
      line: call.phoneNumber?.label || "-",
      ivrPath: call.ivrPath,
      agent: call.agent?.name || "-",
      status: call.status,
      talkSeconds: call.talkSeconds,
      disposition: call.disposition,
    }));

    return { data, total };
  }

  async missedQueue(companyId) {
    if (!companyId) throw httpError(400, "companyId is required");

    const where = { companyId, status: "MISSED", disposition: null };
    const [calls, total] = await Promise.all([
      this.client.call.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { lead: { select: { name: true } }, customer: { select: { name: true } } },
      }),
      this.client.call.count({ where }),
    ]);

    return {
      data: calls.map((call) => ({
        id: call.id,
        name: call.lead?.name || call.customer?.name || "Unknown caller",
        phone: call.fromNumber,
        startedAt: call.startedAt,
      })),
      total,
    };
  }

  async numbers(companyId) {
    if (!companyId) throw httpError(400, "companyId is required");

    const numbers = await this.client.phoneNumber.findMany({ where: withNotDeleted({ companyId }) });
    const today = startOfDay(new Date());
    const missedCounts = numbers.length
      ? await this.client.call.groupBy({
          by: ["phoneNumberId"],
          where: { companyId, status: "MISSED", startedAt: { gte: today }, phoneNumberId: { in: numbers.map((n) => n.id) } },
          _count: { _all: true },
        })
      : [];
    const missedByNumber = new Map(missedCounts.map((row) => [row.phoneNumberId, row._count._all]));

    return numbers.map((number) => ({
      id: number.id,
      number: number.number,
      label: number.label,
      missedToday: missedByNumber.get(number.id) || 0,
    }));
  }
}

module.exports = { CallsSummaryService };
