const { CollectionsRepository } = require("./collections.repository");
const { httpError } = require("../../utils/http-error");

class CollectionsService {
  constructor(repository = new CollectionsRepository()) {
    this.repository = repository;
  }

  async summary(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    const [demands, receipts, refunds] = await Promise.all([
      this.repository.outstandingDemands(query.companyId),
      this.repository.receipts(query.companyId),
      this.repository.refunds(query.companyId),
    ]);

    const outstandingAmount = demands.reduce((sum, demand) => sum + (demand.amount - demand.paidAmount), 0n);
    const receivedAmount = receipts.reduce((sum, receipt) => sum + receipt.amount, 0n);
    const pendingRefundAmount = refunds
      .filter((refund) => ["REQUESTED", "APPROVED"].includes(refund.status))
      .reduce((sum, refund) => sum + refund.amount, 0n);

    return {
      outstandingCount: demands.length,
      outstandingAmount,
      receivedAmount,
      pendingRefundAmount,
    };
  }

  outstanding(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    return this.repository.outstandingDemands(query.companyId);
  }

  async ageing(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    const demands = await this.repository.allOutstanding(query.companyId);
    const now = new Date();
    const buckets = {
      notDue: { label: "Not due yet", count: 0, amount: 0n },
      dueSoon: { label: "Due this week", count: 0, amount: 0n },
      overdue30: { label: "Overdue 1-30d", count: 0, amount: 0n },
      overdue60: { label: "Overdue 31-60d", count: 0, amount: 0n },
      overdue60plus: { label: "Overdue 60d+", count: 0, amount: 0n },
    };

    for (const demand of demands) {
      const outstanding = demand.amount - demand.paidAmount;
      if (outstanding <= 0n) continue;
      const daysDiff = Math.floor((now - new Date(demand.dueDate)) / 86400000);
      let key;
      if (daysDiff < 0) key = "notDue";
      else if (daysDiff <= 7) key = "dueSoon";
      else if (daysDiff <= 30) key = "overdue30";
      else if (daysDiff <= 60) key = "overdue60";
      else key = "overdue60plus";
      buckets[key].count += 1;
      buckets[key].amount += outstanding;
    }

    return Object.values(buckets);
  }

  async dueSoon(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    const days = Number(query.days || 7);
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const demands = await this.repository.dueSoon(query.companyId, until);

    return demands.map((demand) => ({
      id: demand.id,
      bookingId: demand.bookingId,
      demandNumber: demand.demandNumber,
      label: demand.label,
      amount: demand.amount,
      paidAmount: demand.paidAmount,
      dueDate: demand.dueDate,
      status: demand.status,
      customerName: demand.booking?.customer?.name || null,
      projectName: demand.booking?.project?.name || null,
      unitCode: demand.booking?.unit?.unitCode || null,
      projectShortCode: demand.booking?.project?.shortCode || null,
    }));
  }

  async cheques(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    const receipts = await this.repository.cheques(query.companyId);

    return receipts.map((receipt) => ({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      chequeNumber: receipt.chequeNumber,
      bankName: receipt.bankName,
      amount: receipt.amount,
      status: receipt.status,
      instrumentDate: receipt.instrumentDate,
      customerName: receipt.booking?.customer?.name || null,
    }));
  }
}

module.exports = { CollectionsService };
