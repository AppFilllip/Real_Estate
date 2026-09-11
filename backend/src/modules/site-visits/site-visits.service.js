const { SiteVisitsRepository } = require("./site-visits.repository");
const { httpError } = require("../../utils/http-error");
const { resolveOwnerScope } = require("../../utils/scope");
const { withNotDeleted } = require("../../utils/not-deleted");

class SiteVisitsService {
  constructor(repository = new SiteVisitsRepository()) {
    this.repository = repository;
  }

  async list(query, auth) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    const execIds = await resolveOwnerScope(auth);

    return this.repository.findMany({
      where: withNotDeleted({
        companyId: query.companyId,
        ...(query.leadId ? { leadId: query.leadId } : {}),
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(query.execId ? { execId: query.execId } : execIds ? { execId: { in: execIds } } : {}),
        ...(query.status ? { status: query.status } : {}),
      }),
      skip: Number(query.skip || 0),
      take: Math.min(Number(query.take || 25), 500),
    });
  }

  async count(query, auth) {
    if (!query.companyId) throw httpError(400, "companyId is required");
    const execIds = await resolveOwnerScope(auth);
    return this.repository.count(
      withNotDeleted({
        companyId: query.companyId,
        status: { in: ["SCHEDULED", "CONFIRMED", "RESCHEDULED"] },
        ...(execIds ? { execId: { in: execIds } } : {}),
      })
    );
  }

  getById(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    return this.repository.findById(companyId, id);
  }

  async schedule(payload, actor) {
    for (const field of ["companyId", "leadId", "projectId", "execId", "scheduledAt"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }

    const visit = await this.repository.create({
      companyId: payload.companyId,
      leadId: payload.leadId,
      projectId: payload.projectId,
      execId: payload.execId,
      scheduledAt: new Date(payload.scheduledAt),
      slotMinutes: payload.slotMinutes,
      type: payload.type,
      pickupRequired: payload.pickupRequired,
      pickupAddress: payload.pickupAddress,
      pickupAt: payload.pickupAt ? new Date(payload.pickupAt) : undefined,
      driverId: payload.driverId,
      attendeesCount: payload.attendeesCount,
      notes: payload.notes,
      unitsToShowJson: payload.unitsToShowJson,
      brokerId: payload.brokerId,
      createdById: actor && actor.sub,
    });

    await this.repository.updateLead(payload.leadId, {
      stage: "VISIT_SCHEDULED",
      lastActivityAt: new Date(),
    });
    await this.logActivity(payload.companyId, payload.leadId, visit.id, "SITE_VISIT_SCHEDULED", "Site visit scheduled", actor, {
      scheduledAt: visit.scheduledAt,
      projectId: payload.projectId,
      execId: payload.execId,
    });

    return visit;
  }

  async confirm(companyId, id, actor) {
    const visit = await this.ensureVisit(companyId, id);
    if (!["SCHEDULED", "RESCHEDULED"].includes(visit.status)) {
      throw httpError(409, "Only scheduled visits can be confirmed");
    }

    const updated = await this.repository.update(id, { status: "CONFIRMED", confirmedAt: new Date() });
    await this.logActivity(companyId, visit.leadId, id, "SITE_VISIT_CONFIRMED", "Site visit confirmed", actor);
    return updated;
  }

  async reschedule(companyId, id, payload, actor) {
    const visit = await this.ensureVisit(companyId, id);
    if (!payload.scheduledAt) throw httpError(400, "scheduledAt is required");
    if (["VISITED", "CANCELLED"].includes(visit.status)) {
      throw httpError(409, "Completed visits cannot be rescheduled");
    }

    const updated = await this.repository.update(id, {
      status: "RESCHEDULED",
      scheduledAt: new Date(payload.scheduledAt),
      notes: payload.notes || visit.notes,
    });
    await this.logActivity(companyId, visit.leadId, id, "SITE_VISIT_RESCHEDULED", "Site visit rescheduled", actor, {
      scheduledAt: updated.scheduledAt,
    });
    return updated;
  }

  async cancel(companyId, id, payload, actor) {
    const visit = await this.ensureVisit(companyId, id);
    if (["VISITED", "CANCELLED"].includes(visit.status)) {
      throw httpError(409, "Visit cannot be cancelled");
    }

    const updated = await this.repository.update(id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: payload.cancelReason,
    });
    await this.logActivity(companyId, visit.leadId, id, "SITE_VISIT_CANCELLED", "Site visit cancelled", actor, {
      cancelReason: payload.cancelReason,
    });
    return updated;
  }

  async markNoShow(companyId, id, payload, actor) {
    const visit = await this.ensureVisit(companyId, id);
    if (["VISITED", "CANCELLED"].includes(visit.status)) {
      throw httpError(409, "Visit cannot be marked no-show");
    }

    const updated = await this.repository.update(id, {
      status: "NO_SHOW",
      notes: payload.notes || visit.notes,
    });
    await this.logActivity(companyId, visit.leadId, id, "SITE_VISIT_NO_SHOW", "Site visit marked no-show", actor);
    return updated;
  }

  async checkIn(companyId, id, payload, actor) {
    const visit = await this.ensureVisit(companyId, id);
    if (!["SCHEDULED", "CONFIRMED", "RESCHEDULED"].includes(visit.status)) {
      throw httpError(409, "Visit cannot be checked in");
    }

    const outside = Boolean(payload.checkInOutsideGeofence);
    if (outside && !payload.checkInReason) {
      throw httpError(400, "checkInReason is required outside geofence");
    }

    const updated = await this.repository.update(id, {
      checkedInAt: new Date(),
      checkInLat: payload.checkInLat,
      checkInLng: payload.checkInLng,
      checkInOutsideGeofence: outside,
      checkInReason: payload.checkInReason,
      checkInPhotoUrl: payload.checkInPhotoUrl,
    });
    await this.logActivity(companyId, visit.leadId, id, "SITE_VISIT_CHECKED_IN", "Site visit checked in", actor, {
      outsideGeofence: outside,
    });
    return updated;
  }

  async recordOutcome(companyId, id, payload, actor) {
    const visit = await this.ensureVisit(companyId, id);
    for (const field of ["result", "nextStep", "nextFollowUpAt"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }

    const outcome = await this.repository.createOutcome({
      companyId,
      siteVisitId: id,
      result: payload.result,
      budgetFit: payload.budgetFit,
      objectionsJson: payload.objectionsJson,
      preferredUnitsJson: payload.preferredUnitsJson,
      nextStep: payload.nextStep,
      nextFollowUpAt: new Date(payload.nextFollowUpAt),
      notes: payload.notes,
      photosJson: payload.photosJson,
      submittedById: actor && actor.sub,
    });

    await this.repository.update(id, { status: "VISITED" });
    await this.repository.updateLead(visit.leadId, {
      stage: "VISIT_DONE",
      nextFollowUpAt: outcome.nextFollowUpAt,
      hasNoNextStep: false,
      lastActivityAt: new Date(),
    });
    await this.logActivity(companyId, visit.leadId, id, "SITE_VISIT_OUTCOME_RECORDED", "Site visit outcome recorded", actor, {
      outcomeId: outcome.id,
      result: payload.result,
    });

    return outcome;
  }

  async ensureVisit(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    const visit = await this.repository.findById(companyId, id);
    if (!visit) throw httpError(404, "Site visit not found");
    return visit;
  }

  logActivity(companyId, leadId, visitId, type, summary, actor, dataJson) {
    return this.repository.createActivity({
      companyId,
      entityType: "LEAD",
      entityId: leadId,
      type,
      summary,
      dataJson: { siteVisitId: visitId, ...(dataJson || {}) },
      actorType: "USER",
      actorId: actor && actor.sub,
    });
  }
}

module.exports = { SiteVisitsService };
