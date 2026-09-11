const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class InventoryRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  unitsByStatus(companyId, projectId) {
    return this.client.unit.groupBy({
      by: ["status"],
      where: withNotDeleted({
        companyId,
        ...(projectId ? { projectId } : {}),
      }),
      _count: { _all: true },
    });
  }

  activeHoldsCount(companyId, projectId) {
    return this.client.hold.count({
      where: {
        companyId,
        status: { in: ["ACTIVE", "EXTENDED"] },
        ...(projectId ? { projectId } : {}),
      },
    });
  }
}

module.exports = { InventoryRepository };
