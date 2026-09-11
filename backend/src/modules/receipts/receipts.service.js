const { ReceiptsRepository } = require("./receipts.repository");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

class ReceiptsService {
  constructor(repository = new ReceiptsRepository()) {
    this.repository = repository;
  }

  list(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    return this.repository.findMany({
      where: withNotDeleted({
        companyId: query.companyId,
        ...(query.bookingId ? { bookingId: query.bookingId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { receiptNumber: { contains: query.search } },
                { transactionRef: { contains: query.search } },
                { chequeNumber: { contains: query.search } },
                { bankName: { contains: query.search } },
                { remarks: { contains: query.search } },
              ],
            }
          : {}),
      }),
    });
  }

  async getById(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    return this.repository.findById(companyId, id);
  }

  async create(payload, actor) {
    for (const field of ["companyId", "bookingId", "receiptNumber", "amount", "mode", "receivedOn"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }
    const receipt = await this.repository.create({
      companyId: payload.companyId,
      bookingId: payload.bookingId,
      receiptNumber: payload.receiptNumber,
      amount: payload.amount,
      mode: payload.mode,
      status: payload.status,
      transactionRef: payload.transactionRef,
      chequeNumber: payload.chequeNumber,
      bankName: payload.bankName,
      instrumentDate: payload.instrumentDate ? new Date(payload.instrumentDate) : undefined,
      receivedOn: new Date(payload.receivedOn),
      proofUrl: payload.proofUrl,
      remarks: payload.remarks,
      unallocatedAmount: payload.amount,
      paymentGatewayRef: payload.paymentGatewayRef,
      receivedById: payload.receivedById || (actor && actor.sub),
    });
    await this.repository.createLedger({
      companyId: receipt.companyId,
      bookingId: receipt.bookingId,
      entryDate: receipt.receivedOn,
      particulars: `Receipt ${receipt.receiptNumber}`,
      type: "CREDIT",
      amount: receipt.amount,
      balance: 0n,
      sourceType: "RECEIPT",
      sourceId: receipt.id,
    });
    return receipt;
  }

  async update(companyId, id, payload) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    const receipt = await this.repository.findById(companyId, id);
    if (!receipt) throw httpError(404, "Receipt not found");

    const data = {};
    for (const field of ["receiptNumber", "status", "mode", "transactionRef", "chequeNumber", "bankName", "proofUrl", "remarks", "paymentGatewayRef"]) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) data[field] = payload[field];
    }
    if (payload.receivedOn) data.receivedOn = new Date(payload.receivedOn);
    if (payload.instrumentDate) data.instrumentDate = new Date(payload.instrumentDate);
    if (payload.amount !== undefined && payload.amount !== null && payload.amount !== "") {
      data.amount = payload.amount;
      data.unallocatedAmount = payload.amount;
    }

    return this.repository.updateReceipt(id, data);
  }

  async remove(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    const receipt = await this.repository.findById(companyId, id);
    if (!receipt) throw httpError(404, "Receipt not found");
    return this.repository.softDelete(id);
  }

  async allocate(companyId, receiptId, payload) {
    for (const field of ["demandId", "amount"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }
    const receipt = await this.repository.findById(companyId, receiptId);
    if (!receipt) throw httpError(404, "Receipt not found");
    const demand = await this.repository.findDemand(companyId, payload.demandId);
    if (!demand) throw httpError(404, "Demand not found");

    const amount = BigInt(payload.amount);
    if (amount > receipt.unallocatedAmount) throw httpError(409, "Allocation exceeds unallocated receipt amount");

    const allocation = await this.repository.createAllocation({ companyId, receiptId, demandId: payload.demandId, amount });
    const paidAmount = demand.paidAmount + amount;
    const demandStatus = paidAmount >= demand.amount ? "PAID" : "PARTIAL";
    await this.repository.updateDemand(demand.id, { paidAmount, status: demandStatus });
    await this.repository.updateReceipt(receipt.id, { unallocatedAmount: receipt.unallocatedAmount - amount });
    return allocation;
  }
}

module.exports = { ReceiptsService };
