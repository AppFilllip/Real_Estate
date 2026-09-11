const { UnitsRepository } = require("./units.repository");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");

const allowedTransitions = {
  AVAILABLE: ["ON_HOLD", "BLOCKED", "NOT_FOR_SALE"],
  ON_HOLD: ["AVAILABLE", "BOOKED"],
  BLOCKED: ["AVAILABLE", "BOOKED", "NOT_FOR_SALE"],
  BOOKED: ["AGREEMENT", "AVAILABLE"],
  AGREEMENT: ["REGISTERED"],
  REGISTERED: ["POSSESSION"],
  POSSESSION: [],
  NOT_FOR_SALE: ["AVAILABLE"],
};

class UnitsService {
  constructor(repository = new UnitsRepository()) {
    this.repository = repository;
  }

  list(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");

    return this.repository.findMany({
      where: withNotDeleted({
        companyId: query.companyId,
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.blockId ? { blockId: query.blockId } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.unitCode ? { unitCode: query.unitCode } : {}),
        ...(query.search
          ? {
              OR: [
                { unitCode: { contains: query.search } },
                { number: { contains: query.search } },
                { areaUnit: { contains: query.search } },
                { notForSaleReason: { contains: query.search } },
              ],
            }
          : {}),
      }),
      skip: Number(query.skip || 0),
      take: Math.min(Number(query.take || 25), 100),
    });
  }

  getById(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    return this.repository.findById(companyId, id);
  }

  create(payload) {
    for (const field of ["companyId", "projectId", "blockId", "unitCode", "number", "area"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }

    return this.repository.create({
      companyId: payload.companyId,
      projectId: payload.projectId,
      blockId: payload.blockId,
      floorId: payload.floorId,
      unitCode: payload.unitCode,
      number: payload.number,
      area: payload.area,
      areaUnit: payload.areaUnit,
      lengthFt: payload.lengthFt,
      widthFt: payload.widthFt,
      facing: payload.facing,
      roadWidthFt: payload.roadWidthFt,
      attributesJson: payload.attributesJson,
      status: payload.status,
      notForSaleReason: payload.notForSaleReason,
      availableSince: payload.availableSince || new Date(),
    });
  }

  update(companyId, id, payload) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    const { companyId: _companyId, id: _id, status: _status, ...data } = payload;
    return this.repository.update(id, data);
  }

  async remove(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    const unit = await this.repository.findById(companyId, id);
    if (!unit) throw httpError(404, "Unit not found");
    return this.repository.softDelete(id);
  }

  async changeStatus(companyId, id, payload, actor) {
    if (!payload.status) throw httpError(400, "status is required");

    const unit = await this.repository.findById(companyId, id);
    if (!unit) throw httpError(404, "Unit not found");

    const allowed = allowedTransitions[unit.status] || [];
    if (!allowed.includes(payload.status)) {
      throw httpError(409, `Cannot move unit from ${unit.status} to ${payload.status}`);
    }

    return this.repository.changeStatus({
      companyId,
      unitId: id,
      toStatus: payload.status,
      reason: payload.reason,
      changedById: actor && actor.sub,
      actorType: "USER",
      leadId: payload.leadId,
      bookingId: payload.bookingId,
    });
  }
}

module.exports = { UnitsService, allowedTransitions };
