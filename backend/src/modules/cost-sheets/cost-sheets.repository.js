const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class CostSheetsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findMany({ where, skip = 0, take = 25 }) {
    return this.client.costSheet.findMany({ where, skip, take, orderBy: { createdAt: "desc" } });
  }

  findById(companyId, id) {
    return this.client.costSheet.findFirst({ where: withNotDeleted({ id, companyId }) });
  }

  create(data) {
    return this.client.costSheet.create({ data });
  }

  createNegotiation(data) {
    return this.client.negotiation.create({ data });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }
}

module.exports = { CostSheetsRepository };
