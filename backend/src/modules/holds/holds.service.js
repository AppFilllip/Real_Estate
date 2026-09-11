const { HoldsRepository } = require("./holds.repository");
const { UnitsRepository } = require("../units/units.repository");
const { httpError } = require("../../utils/http-error");

class HoldsService {
  constructor(repository = new HoldsRepository(), unitsRepository = new UnitsRepository()) {
    this.repository = repository;
    this.unitsRepository = unitsRepository;
  }

  list(query) {
    if (!query.companyId) throw httpError(400, "companyId is required");

    return this.repository.findMany({
      where: {
        companyId: query.companyId,
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.unitId ? { unitId: query.unitId } : {}),
        ...(query.leadId ? { leadId: query.leadId } : {}),
        ...(query.heldById ? { heldById: query.heldById } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      skip: Number(query.skip || 0),
      take: Math.min(Number(query.take || 25), 100),
    });
  }

  async create(payload, actor) {
    for (const field of ["companyId", "projectId", "unitId", "leadId", "heldById", "expiresAt"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }

    const unit = await this.unitsRepository.findById(payload.companyId, payload.unitId);
    if (!unit) throw httpError(404, "Unit not found");
    if (unit.status !== "AVAILABLE") throw httpError(409, "Only available units can be held");

    const activeHold = await this.repository.findActiveForUnit(payload.companyId, payload.unitId);
    if (activeHold) throw httpError(409, "Unit already has an active hold");

    const hold = await this.repository.create({
      companyId: payload.companyId,
      projectId: payload.projectId,
      unitId: payload.unitId,
      leadId: payload.leadId,
      heldById: payload.heldById,
      reason: payload.reason,
      expiresAt: new Date(payload.expiresAt),
    });

    await this.unitsRepository.changeStatus({
      companyId: payload.companyId,
      unitId: payload.unitId,
      toStatus: "ON_HOLD",
      reason: payload.reason || "Unit held",
      changedById: actor && actor.sub,
      actorType: "USER",
      leadId: payload.leadId,
    });

    return hold;
  }

  async release(companyId, id, payload, actor) {
    const hold = await this.repository.findById(companyId, id);
    if (!hold) throw httpError(404, "Hold not found");
    if (!["ACTIVE", "EXTENDED"].includes(hold.status)) throw httpError(409, "Hold is not active");

    const released = await this.repository.release(id, payload.releaseNote);

    await this.unitsRepository.changeStatus({
      companyId,
      unitId: hold.unitId,
      toStatus: "AVAILABLE",
      reason: payload.releaseNote || "Hold released",
      changedById: actor && actor.sub,
      actorType: "USER",
      leadId: hold.leadId,
    });

    return released;
  }
}

module.exports = { HoldsService };
