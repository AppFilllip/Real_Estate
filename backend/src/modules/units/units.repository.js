const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class UnitsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findMany({ where, skip = 0, take = 25 }) {
    return this.client.unit.findMany({ where, skip, take, orderBy: { createdAt: "desc" } });
  }

  findById(companyId, id) {
    return this.client.unit.findFirst({ where: withNotDeleted({ id, companyId }) });
  }

  create(data) {
    return this.client.unit.create({ data });
  }

  update(id, data) {
    return this.client.unit.update({ where: { id }, data });
  }

  softDelete(id) {
    return this.client.unit.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async changeStatus({ companyId, unitId, toStatus, reason, changedById, actorType, leadId, bookingId }) {
    const unit = await this.findById(companyId, unitId);
    if (!unit) return null;

    const updated = await this.client.unit.update({
      where: { id: unitId },
      data: {
        status: toStatus,
        availableSince: toStatus === "AVAILABLE" ? new Date() : unit.availableSince,
        version: { increment: 1 },
      },
    });

    await this.client.unitStatusHistory.create({
      data: {
        companyId,
        unitId,
        fromStatus: unit.status,
        toStatus,
        reason,
        changedById,
        actorType: actorType || "USER",
        leadId,
        bookingId,
      },
    });

    return updated;
  }
}

module.exports = { UnitsRepository };
