const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class ReceiptsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  findMany({ where }) {
    return this.client.receipt.findMany({ where, orderBy: { receivedOn: "desc" }, include: { allocations: true } });
  }

  create(data) {
    return this.client.receipt.create({ data });
  }

  findById(companyId, id) {
    return this.client.receipt.findFirst({ where: withNotDeleted({ id, companyId }), include: { allocations: true, booking: true } });
  }

  createAllocation(data) {
    return this.client.receiptAllocation.create({ data });
  }

  updateReceipt(id, data) {
    return this.client.receipt.update({ where: { id }, data });
  }

  softDelete(id) {
    return this.client.receipt.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  findDemand(companyId, id) {
    return this.client.demand.findFirst({ where: withNotDeleted({ id, companyId }) });
  }

  updateDemand(id, data) {
    return this.client.demand.update({ where: { id }, data });
  }

  createLedger(data) {
    return this.client.ledger.create({ data });
  }
}

module.exports = { ReceiptsRepository };
