const { prisma } = require("../../db/prisma");

class TokensRepository {
  constructor(client = prisma) {
    this.client = client;
  }
  findMany({ where, skip = 0, take = 25 }) {
    return this.client.token.findMany({ where, skip, take, orderBy: { createdAt: "desc" } });
  }
  findById(companyId, id) {
    return this.client.token.findFirst({ where: { id, companyId } });
  }
  findLiveForUnit(companyId, unitId) {
    return this.client.token.findFirst({ where: { companyId, unitId, status: "RECEIVED" } });
  }
  create(data) {
    return this.client.token.create({ data });
  }
  update(id, data) {
    return this.client.token.update({ where: { id }, data });
  }
  updateLead(id, data) {
    return this.client.lead.update({ where: { id }, data });
  }
  updateUnit(id, data) {
    return this.client.unit.update({ where: { id }, data });
  }
  createActivity(data) {
    return this.client.activity.create({ data });
  }
}

module.exports = { TokensRepository };
