const crypto = require("crypto");
const { CostSheetsRepository } = require("./cost-sheets.repository");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

class CostSheetsService {
  constructor(repository = new CostSheetsRepository()) {
    this.repository = repository;
  }

  list(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    return this.repository.findMany({
      where: withNotDeleted({ companyId: query.companyId, ...(query.leadId ? { leadId: query.leadId } : {}), ...(query.unitId ? { unitId: query.unitId } : {}) }),
      skip: Number(query.skip || 0),
      take: Math.min(Number(query.take || 25), 100),
    });
  }

  getById(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    return this.repository.findById(companyId, id);
  }

  async create(payload, actor) {
    for (const field of ["companyId", "projectId", "leadId", "unitId", "rateCardId", "applicantName", "baseCost", "agreementValue", "totalCost", "breakupJson"]) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") throw httpError(400, `${field} is required`);
    }
    const costSheet = await this.repository.create({
      companyId: payload.companyId,
      projectId: payload.projectId,
      leadId: payload.leadId,
      unitId: payload.unitId,
      rateCardId: payload.rateCardId,
      applicantName: payload.applicantName,
      baseCost: payload.baseCost,
      plcTotal: payload.plcTotal,
      chargesTotal: payload.chargesTotal,
      gstAmount: payload.gstAmount,
      discountAmount: payload.discountAmount,
      discountPct: payload.discountPct,
      agreementValue: payload.agreementValue,
      stampDuty: payload.stampDuty,
      registration: payload.registration,
      totalCost: payload.totalCost,
      breakupJson: payload.breakupJson,
      paymentPlanTemplateId: payload.paymentPlanTemplateId,
      loanAssumed: payload.loanAssumed,
      loanPct: payload.loanPct,
      emiEstimate: payload.emiEstimate,
      validUntil: payload.validUntil ? new Date(payload.validUntil) : undefined,
      isIndicative: payload.isIndicative,
      shareToken: crypto.randomBytes(16).toString("hex"),
      preparedById: payload.preparedById || (actor && actor.sub),
      offerIds: payload.offerIds || [],
    });
    await this.activity(payload.companyId, payload.leadId, "COST_SHEET_CREATED", "Cost sheet created", actor, { costSheetId: costSheet.id });
    return costSheet;
  }

  async addNegotiation(companyId, costSheetId, payload, actor) {
    const costSheet = await this.getById(companyId, costSheetId);
    if (!costSheet) throw httpError(404, "Cost sheet not found");
    const negotiation = await this.repository.createNegotiation({
      companyId,
      costSheetId,
      customerAsked: payload.customerAsked,
      weOffered: payload.weOffered,
      notes: payload.notes,
      loggedById: actor && actor.sub,
    });
    await this.activity(companyId, costSheet.leadId, "NEGOTIATION_LOGGED", "Negotiation logged", actor, { costSheetId, negotiationId: negotiation.id });
    return negotiation;
  }

  activity(companyId, leadId, type, summary, actor, dataJson) {
    return this.repository.createActivity({ companyId, entityType: "LEAD", entityId: leadId, type, summary, dataJson, actorType: "USER", actorId: actor && actor.sub });
  }
}

module.exports = { CostSheetsService };
