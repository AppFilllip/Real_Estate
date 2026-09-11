const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class SiteVisitsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findMany({ where, skip = 0, take = 25 }) {
    return this.client.siteVisit.findMany({
      where,
      skip,
      take,
      include: {
        outcome: true,
        lead: { select: { id: true, name: true, phone: true } },
        project: { select: { id: true, name: true, shortCode: true } },
        exec: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });
  }

  count(where) {
    return this.client.siteVisit.count({ where });
  }

  findById(companyId, id) {
    return this.client.siteVisit.findFirst({
      where: withNotDeleted({ id, companyId }),
      include: {
        outcome: true,
        lead: { select: { id: true, name: true, phone: true } },
        project: { select: { id: true, name: true, shortCode: true } },
        exec: { select: { id: true, name: true } },
        driver: { select: { id: true, name: true } },
      },
    });
  }

  create(data) {
    return this.client.siteVisit.create({ data: { deletedAt: null, ...data } });
  }

  update(id, data) {
    return this.client.siteVisit.update({ where: { id }, data });
  }

  createOutcome(data) {
    return this.client.siteVisitOutcome.create({ data });
  }

  updateLead(id, data) {
    return this.client.lead.update({ where: { id }, data });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }
}

module.exports = { SiteVisitsRepository };
