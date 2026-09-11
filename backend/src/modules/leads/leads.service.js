const { LeadsRepository } = require("./leads.repository");
const { httpError } = require("../../utils/http-error");
const { resolveOwnerScope } = require("../../utils/scope");

const leadStageOrder = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "VISIT_SCHEDULED",
  "VISIT_DONE",
  "NEGOTIATION",
  "TOKEN",
  "BOOKED",
];

function isTruthy(value) {
  return value === true || value === "true" || value === "1";
}

function temperatureFromScore(score) {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

class LeadsService {
  constructor(repository = new LeadsRepository()) {
    this.repository = repository;
  }

  async listLeads(query, auth) {
    if (!query.companyId) {
      throw httpError(400, "companyId is required");
    }

    const ownerIds = await resolveOwnerScope(auth);

    return this.repository.findMany({
      companyId: query.companyId,
      stage: query.stage,
      ownerId: query.ownerId,
      ownerIds,
      unassigned: isTruthy(query.unassigned),
      temperature: query.temperature,
      newToday: isTruthy(query.newToday),
      followUpDue: isTruthy(query.followUpDue),
      hasBroker: isTruthy(query.hasBroker),
      search: query.search,
      skip: Number(query.skip || 0),
      take: Math.min(Number(query.take || 25), 100),
    });
  }

  async getLeadCounts(companyId, userId, auth) {
    if (!companyId) {
      throw httpError(400, "companyId is required");
    }

    const ownerIds = await resolveOwnerScope(auth);

    const [all, mine, unassigned, newToday, followUpDue, hot, visitScheduled, negotiation, brokerLeads] = await Promise.all([
      this.repository.count({ companyId, ownerIds }),
      userId ? this.repository.count({ companyId, ownerId: userId }) : 0,
      this.repository.count({ companyId, unassigned: true, ownerIds }),
      this.repository.count({ companyId, newToday: true, ownerIds }),
      this.repository.count({ companyId, followUpDue: true, ownerIds }),
      this.repository.count({ companyId, temperature: "HOT", ownerIds }),
      this.repository.count({ companyId, stage: "VISIT_SCHEDULED", ownerIds }),
      this.repository.count({ companyId, stage: "NEGOTIATION", ownerIds }),
      this.repository.count({ companyId, hasBroker: true, ownerIds }),
    ]);

    return { all, mine, unassigned, newToday, followUpDue, hot, visitScheduled, negotiation, brokerLeads };
  }

  getLead(companyId, id) {
    if (!companyId || !id) {
      throw httpError(400, "companyId and id are required");
    }

    return this.repository.findById(companyId, id);
  }

  createLead(payload) {
    if (!payload.companyId || !payload.name || !payload.phone) {
      throw httpError(400, "companyId, name and phone are required");
    }

    const score = this.calculateScore({
      stage: payload.stage || "NEW",
      hasRequirement: Boolean(payload.requirement),
      hasProject: Boolean(payload.projectId),
      hasOwner: Boolean(payload.ownerId),
    });

    return this.repository.create({
      companyId: payload.companyId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      city: payload.city,
      projectId: payload.projectId,
      sourceId: payload.sourceId,
      ownerId: payload.ownerId,
      stage: payload.stage,
      score,
      temperature: temperatureFromScore(score),
      consentText: payload.consentText,
      consentAt: payload.consentText ? new Date() : undefined,
      createdById: payload.createdById,
    });
  }

  async updateLead(companyId, id, payload) {
    await this.ensureLead(companyId, id);
    const allowed = [
      "name",
      "phone",
      "altPhone",
      "email",
      "city",
      "languagePreference",
      "projectId",
      "sourceId",
      "campaignId",
      "brokerId",
      "brokerTaggedAt",
      "protectionEndsAt",
      "utmJson",
      "nextFollowUpAt",
      "marketingOptOut",
      "dnd",
    ];
    const data = {};

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) data[field] = payload[field];
    }

    return this.repository.update(id, data);
  }

  findDuplicates(query) {
    if (!query.companyId || !query.phone) {
      throw httpError(400, "companyId and phone are required");
    }
    return this.repository.findDuplicates(query.companyId, query.phone, query.excludeLeadId);
  }

  async changeStage(companyId, id, payload, actor) {
    const lead = await this.ensureLead(companyId, id);
    if (!payload.stage) throw httpError(400, "stage is required");

    const data = {
      stage: payload.stage,
      lostReason: payload.lostReason,
      lostNote: payload.lostNote,
      competitorName: payload.competitorName,
      reEngageAfter: payload.reEngageAfter,
      lastActivityAt: new Date(),
    };

    const score = this.calculateScore({
      stage: payload.stage,
      hasRequirement: Boolean(lead.requirement),
      hasProject: Boolean(lead.projectId),
      hasOwner: Boolean(lead.ownerId),
    });
    data.score = score;
    data.temperature = temperatureFromScore(score);

    const updated = await this.repository.update(id, data);
    await this.logActivity(companyId, id, "LEAD_STAGE_CHANGED", `Stage changed to ${payload.stage}`, actor, {
      fromStage: lead.stage,
      toStage: payload.stage,
    });
    return updated;
  }

  async assignOwner(companyId, id, payload, actor) {
    await this.ensureLead(companyId, id);
    if (!payload.ownerId) throw httpError(400, "ownerId is required");

    const updated = await this.repository.update(id, {
      ownerId: payload.ownerId,
      lastActivityAt: new Date(),
    });
    await this.logActivity(companyId, id, "LEAD_ASSIGNED", "Lead assigned", actor, {
      ownerId: payload.ownerId,
    });
    return updated;
  }

  async getTimeline(companyId, id) {
    await this.ensureLead(companyId, id);
    return this.repository.getTimeline(companyId, id);
  }

  async addNote(companyId, id, payload, actor) {
    await this.ensureLead(companyId, id);
    if (!payload.body) throw httpError(400, "body is required");

    const note = await this.repository.createNote({
      companyId,
      leadId: id,
      body: payload.body,
      isInternal: payload.isInternal !== undefined ? payload.isInternal : true,
      attachmentsJson: payload.attachmentsJson,
      mentionsJson: payload.mentionsJson,
      authorId: payload.authorId || (actor && actor.sub),
    });
    await this.logActivity(companyId, id, "NOTE_ADDED", "Note added", actor, { noteId: note.id });
    return note;
  }

  async listNotes(companyId, id) {
    await this.ensureLead(companyId, id);
    return this.repository.listNotes(companyId, id);
  }

  async addTask(companyId, id, payload, actor) {
    await this.ensureLead(companyId, id);
    for (const field of ["type", "dueAt", "assigneeId"]) {
      if (!payload[field]) throw httpError(400, `${field} is required`);
    }

    const task = await this.repository.createTask({
      companyId,
      leadId: id,
      type: payload.type,
      title: payload.title,
      note: payload.note,
      dueAt: new Date(payload.dueAt),
      reminderMinutesBefore: payload.reminderMinutesBefore,
      assigneeId: payload.assigneeId,
      createdById: payload.createdById || (actor && actor.sub),
    });
    await this.repository.update(id, { nextFollowUpAt: task.dueAt, hasNoNextStep: false });
    await this.logActivity(companyId, id, "TASK_CREATED", "Follow-up task created", actor, { taskId: task.id });
    return task;
  }

  async listTasks(companyId, id) {
    await this.ensureLead(companyId, id);
    return this.repository.listTasks(companyId, id);
  }

  async upsertRequirement(companyId, id, payload, actor) {
    const lead = await this.ensureLead(companyId, id);
    const requirement = await this.repository.upsertRequirement({
      leadId: id,
      data: {
        companyId,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        areaMin: payload.areaMin,
        areaMax: payload.areaMax,
        facingsJson: payload.facingsJson,
        attributesJson: payload.attributesJson,
        timeline: payload.timeline,
        purpose: payload.purpose,
        notes: payload.notes,
      },
    });

    const score = this.calculateScore({
      stage: lead.stage,
      hasRequirement: true,
      hasProject: Boolean(lead.projectId),
      hasOwner: Boolean(lead.ownerId),
    });
    await this.repository.update(id, { score, temperature: temperatureFromScore(score) });
    await this.logActivity(companyId, id, "REQUIREMENT_UPDATED", "Requirement updated", actor, {
      requirementId: requirement.id,
    });
    return requirement;
  }

  async addShortlist(companyId, id, payload, actor) {
    await this.ensureLead(companyId, id);
    if (!payload.unitId) throw httpError(400, "unitId is required");

    const shortlist = await this.repository.addShortlist({ companyId, leadId: id, unitId: payload.unitId });
    await this.logActivity(companyId, id, "UNIT_SHORTLISTED", "Unit shortlisted", actor, {
      shortlistId: shortlist.id,
      unitId: payload.unitId,
    });
    return shortlist;
  }

  async removeShortlist(companyId, id, unitId, actor) {
    await this.ensureLead(companyId, id);
    const removed = await this.repository.removeShortlist(id, unitId);
    await this.logActivity(companyId, id, "UNIT_SHORTLIST_REMOVED", "Unit removed from shortlist", actor, { unitId });
    return removed;
  }

  async tagBroker(companyId, id, payload, actor) {
    await this.ensureLead(companyId, id);
    if (!payload.brokerId) throw httpError(400, "brokerId is required");

    const taggedAt = new Date();
    const protectionDays = Number(payload.leadProtectionDays || 60);
    const protectionEndsAt = new Date(taggedAt);
    protectionEndsAt.setDate(protectionEndsAt.getDate() + protectionDays);

    const updated = await this.repository.update(id, {
      brokerId: payload.brokerId,
      brokerTaggedAt: taggedAt,
      protectionEndsAt,
      lastActivityAt: taggedAt,
    });
    await this.logActivity(companyId, id, "BROKER_TAGGED", "Broker tagged to lead", actor, {
      brokerId: payload.brokerId,
      protectionEndsAt,
    });
    return updated;
  }

  async ensureLead(companyId, id) {
    if (!companyId || !id) throw httpError(400, "companyId and id are required");
    const lead = await this.repository.findById(companyId, id);
    if (!lead) throw httpError(404, "Lead not found");
    return lead;
  }

  logActivity(companyId, leadId, type, summary, actor, dataJson) {
    return this.repository.createActivity({
      companyId,
      entityType: "LEAD",
      entityId: leadId,
      type,
      summary,
      dataJson,
      actorType: "USER",
      actorId: actor && actor.sub,
    });
  }

  calculateScore({ stage, hasRequirement, hasProject, hasOwner }) {
    let score = 10;
    const stageIndex = leadStageOrder.indexOf(stage);
    if (stageIndex > -1) score += stageIndex * 10;
    if (hasRequirement) score += 15;
    if (hasProject) score += 10;
    if (hasOwner) score += 5;
    return Math.min(score, 100);
  }
}

module.exports = { LeadsService };
