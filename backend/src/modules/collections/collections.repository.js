const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

class CollectionsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  outstandingDemands(companyId) {
    return this.client.demand.findMany({
      where: withNotDeleted({ companyId, status: { in: ["DUE", "OVERDUE", "PARTIAL"] } }),
      orderBy: { dueDate: "asc" },
    });
  }

  receipts(companyId) {
    return this.client.receipt.findMany({ where: withNotDeleted({ companyId }) });
  }

  refunds(companyId) {
    return this.client.refund.findMany({ where: { companyId } });
  }

  allOutstanding(companyId) {
    return this.client.demand.findMany({
      where: withNotDeleted({ companyId, status: { in: ["UPCOMING", "DUE", "OVERDUE", "PARTIAL"] } }),
      select: { dueDate: true, status: true, amount: true, paidAmount: true },
    });
  }

  dueSoon(companyId, until) {
    return this.client.demand.findMany({
      where: withNotDeleted({ companyId, status: { in: ["DUE", "OVERDUE", "PARTIAL"] }, dueDate: { lte: until } }),
      orderBy: { dueDate: "asc" },
      take: 20,
      include: { booking: { include: { customer: true, project: true, unit: true } } },
    });
  }

  cheques(companyId) {
    return this.client.receipt.findMany({
      where: withNotDeleted({ companyId, mode: "CHEQUE" }),
      orderBy: { receivedOn: "desc" },
      take: 10,
      include: { booking: { include: { customer: true } } },
    });
  }
}

module.exports = { CollectionsRepository };
