const { InventoryRepository } = require("./inventory.repository");
const { httpError } = require("../../utils/http-error");

const unitStatuses = [
  "AVAILABLE",
  "ON_HOLD",
  "BLOCKED",
  "BOOKED",
  "AGREEMENT",
  "REGISTERED",
  "POSSESSION",
  "NOT_FOR_SALE",
];

class InventoryService {
  constructor(repository = new InventoryRepository()) {
    this.repository = repository;
  }

  async summary(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");

    const [grouped, activeHolds] = await Promise.all([
      this.repository.unitsByStatus(query.companyId, query.projectId),
      this.repository.activeHoldsCount(query.companyId, query.projectId),
    ]);

    const byStatus = Object.fromEntries(unitStatuses.map((status) => [status, 0]));
    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
    }

    return {
      projectId: query.projectId || null,
      totalUnits: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      activeHolds,
      byStatus,
    };
  }
}

module.exports = { InventoryService };
