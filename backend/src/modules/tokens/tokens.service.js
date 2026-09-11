const { TokensRepository } = require("./tokens.repository");
const { httpError } = require("../../utils/http-error");

class TokensService {
  constructor(repository = new TokensRepository()) {
    this.repository = repository;
  }
  list(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    return this.repository.findMany({ where: { companyId: query.companyId, ...(query.status ? { status: query.status } : {}), ...(query.unitId ? { unitId: query.unitId } : {}) }, skip: Number(query.skip || 0), take: Math.min(Number(query.take || 25), 100) });
  }
  async create(payload, actor) {
    for (const f of ["companyId", "projectId", "leadId", "unitId", "receiptNumber", "amount", "mode", "receivedOn", "agreedPrice", "validUntil"]) {
      if (!payload[f]) throw httpError(400, `${f} is required`);
    }
    if (await this.repository.findLiveForUnit(payload.companyId, payload.unitId)) throw httpError(409, "Unit already has a live token");
    const token = await this.repository.create({
      companyId: payload.companyId, projectId: payload.projectId, leadId: payload.leadId, unitId: payload.unitId,
      receiptNumber: payload.receiptNumber, amount: payload.amount, mode: payload.mode, transactionRef: payload.transactionRef,
      chequeNumber: payload.chequeNumber, bankName: payload.bankName, receivedOn: new Date(payload.receivedOn), proofUrl: payload.proofUrl,
      agreedPrice: payload.agreedPrice, validUntil: new Date(payload.validUntil), notes: payload.notes, paymentLinkId: payload.paymentLinkId,
      receivedById: payload.receivedById || (actor && actor.sub),
    });
    await this.repository.updateLead(payload.leadId, { stage: "TOKEN", lastActivityAt: new Date() });
    await this.repository.updateUnit(payload.unitId, { status: "BLOCKED", lockedAt: new Date(), version: { increment: 1 } });
    await this.activity(payload.companyId, payload.leadId, "TOKEN_RECEIVED", "Token received", actor, { tokenId: token.id, amount: token.amount.toString() });
    return token;
  }
  async convert(companyId, id, actor) {
    const token = await this.repository.findById(companyId, id);
    if (!token) throw httpError(404, "Token not found");
    const updated = await this.repository.update(id, { status: "CONVERTED" });
    await this.activity(companyId, token.leadId, "TOKEN_CONVERTED", "Token converted", actor, { tokenId: id });
    return updated;
  }
  async refund(companyId, id, payload, actor) {
    const token = await this.repository.findById(companyId, id);
    if (!token) throw httpError(404, "Token not found");
    const updated = await this.repository.update(id, { status: "REFUNDED", notes: payload.notes || token.notes });
    await this.activity(companyId, token.leadId, "TOKEN_REFUNDED", "Token refunded", actor, { tokenId: id });
    return updated;
  }
  activity(companyId, leadId, type, summary, actor, dataJson) {
    return this.repository.createActivity({ companyId, entityType: "LEAD", entityId: leadId, type, summary, dataJson, actorType: "USER", actorId: actor && actor.sub });
  }
}

module.exports = { TokensService };
