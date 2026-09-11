const { prisma } = require("../../db/prisma");

class HoldsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findMany({ where, skip = 0, take = 25 }) {
    return this.client.hold.findMany({ where, skip, take, orderBy: { createdAt: "desc" } });
  }

  findById(companyId, id) {
    return this.client.hold.findFirst({ where: { id, companyId } });
  }

  findActiveForUnit(companyId, unitId) {
    return this.client.hold.findFirst({
      where: { companyId, unitId, status: { in: ["ACTIVE", "EXTENDED"] } },
    });
  }

  create(data) {
    return this.client.hold.create({ data });
  }

  release(id, releaseNote) {
    return this.client.hold.update({
      where: { id },
      data: { status: "RELEASED", releasedAt: new Date(), releaseNote },
    });
  }
}

module.exports = { HoldsRepository };
