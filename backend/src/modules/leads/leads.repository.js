const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

class LeadsRepository {
  constructor(client = prisma) {
    this.client = client;
  }

  buildWhere({ companyId, stage, ownerId, ownerIds, unassigned, temperature, newToday, followUpDue, hasBroker, search }) {
    return withNotDeleted({
      companyId,
      ...(stage ? { stage } : {}),
      ...(unassigned ? { ownerId: null } : ownerId ? { ownerId } : ownerIds ? { ownerId: { in: ownerIds } } : {}),
      ...(temperature ? { temperature } : {}),
      ...(newToday ? { createdAt: { gte: startOfToday() } } : {}),
      ...(followUpDue ? { nextFollowUpAt: { lte: new Date() } } : {}),
      ...(hasBroker ? { brokerId: { not: null } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    });
  }

  findMany({ skip = 0, take = 25, ...filters }) {
    return this.client.lead.findMany({
      where: this.buildWhere(filters),
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true } },
        source: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  count(filters) {
    return this.client.lead.count({ where: this.buildWhere(filters) });
  }

  findById(companyId, id) {
    return this.client.lead.findFirst({
      where: withNotDeleted({ id, companyId }),
      include: {
        requirement: true,
        shortlists: { include: { unit: { select: { id: true, unitCode: true } } } },
        owner: { select: { id: true, name: true } },
        source: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
  }

  findDuplicates(companyId, phone, excludeLeadId) {
    return this.client.lead.findMany({
      where: withNotDeleted({
        companyId,
        phone,
        mergedIntoId: null,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
      }),
      orderBy: { createdAt: "desc" },
    });
  }

  create(data) {
    return this.client.lead.create({ data });
  }

  update(id, data) {
    return this.client.lead.update({ where: { id }, data });
  }

  createActivity(data) {
    return this.client.activity.create({ data });
  }

  getTimeline(companyId, leadId) {
    return this.client.activity.findMany({
      where: { companyId, entityType: "LEAD", entityId: leadId },
      orderBy: { createdAt: "desc" },
    });
  }

  createNote(data) {
    return this.client.note.create({ data });
  }

  listNotes(companyId, leadId) {
    return this.client.note.findMany({
      where: withNotDeleted({ companyId, leadId }),
      orderBy: { createdAt: "desc" },
    });
  }

  createTask(data) {
    return this.client.task.create({ data });
  }

  listTasks(companyId, leadId) {
    return this.client.task.findMany({
      where: withNotDeleted({ companyId, leadId }),
      orderBy: { dueAt: "asc" },
    });
  }

  upsertRequirement({ leadId, data }) {
    return this.client.leadRequirement.upsert({
      where: { leadId },
      update: data,
      create: { ...data, leadId },
    });
  }

  addShortlist(data) {
    return this.client.leadShortlist.create({ data });
  }

  removeShortlist(leadId, unitId) {
    return this.client.leadShortlist.delete({
      where: { leadId_unitId: { leadId, unitId } },
    });
  }
}

module.exports = { LeadsRepository };
