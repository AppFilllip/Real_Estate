const { prisma } = require("../db/prisma");

class CrudRepository {
  constructor(modelName, client = prisma) {
    this.model = client[modelName];
  }

  findMany({ where = {}, skip = 0, take = 25, orderBy = { createdAt: "desc" } }) {
    return this.model.findMany({ where, skip, take, orderBy });
  }

  findById(where) {
    return this.model.findFirst({ where });
  }

  create(data) {
    return this.model.create({ data });
  }

  update(where, data) {
    return this.model.update({ where, data });
  }

  softDelete(where) {
    return this.model.update({ where, data: { deletedAt: new Date() } });
  }

  delete(where) {
    return this.model.delete({ where });
  }
}

module.exports = { CrudRepository };
