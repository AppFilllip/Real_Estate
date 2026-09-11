const { prisma } = require("../../db/prisma");

class ReportsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  count(modelName, where) {
    return this.client[modelName].count({ where });
  }

  sum(modelName, field, where) {
    return this.client[modelName].aggregate({ where, _sum: { [field]: true } });
  }

  groupCount(modelName, by, where) {
    return this.client[modelName].groupBy({
      by: [by],
      where,
      _count: { _all: true },
    });
  }

  groupBookingSales(by, where) {
    return this.client.booking.groupBy({
      by: [by],
      where,
      _count: { _all: true },
      _sum: { agreementValue: true },
    });
  }

  async leadsBySource(where) {
    const leads = await this.client.lead.findMany({
      where,
      select: {
        sourceId: true,
        source: { select: { name: true } },
      },
    });

    return leads.reduce((items, lead) => {
      const key = lead.sourceId || "direct";
      const existing = items.get(key) || {
        sourceId: lead.sourceId,
        sourceName: lead.source ? lead.source.name : "Direct / Unknown",
        count: 0,
      };
      existing.count += 1;
      items.set(key, existing);
      return items;
    }, new Map());
  }
}

module.exports = { ReportsRepository };
