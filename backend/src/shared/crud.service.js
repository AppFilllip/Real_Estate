const { withNotDeleted } = require("../utils/not-deleted");

class CrudService {
  constructor(repository, options) {
    this.repository = repository;
    this.options = options;
  }

  list(query) {
    const where = this.buildScopedWhere(query);

    return this.repository.findMany({
      where,
      skip: Number(query.skip || 0),
      take: Math.min(Number(query.take || 25), 100),
      orderBy: this.options.orderBy,
    });
  }

  getById(companyId, id) {
    this.requireId(id);
    return this.repository.findById(this.buildScopedWhere({ companyId, id }));
  }

  create(payload) {
    this.validateRequired(payload, this.options.requiredFields);
    return this.repository.create(this.pickAllowed(payload));
  }

  update(companyId, id, payload) {
    this.requireId(id);
    return this.repository.update({ id }, this.pickAllowed(payload, { partial: true, companyId }));
  }

  remove(companyId, id) {
    this.requireId(id);
    if (this.options.softDelete === false) {
      return this.repository.delete({ id });
    }
    return this.repository.softDelete({ id });
  }

  buildScopedWhere(query) {
    const where = {};

    if (this.options.scopedByCompany !== false) {
      if (!query.companyId) {
        const error = new Error("companyId is required");
        error.statusCode = 400;
        throw error;
      }
      where.companyId = query.companyId;
    }

    if (query.id) {
      where.id = query.id;
    }

    for (const field of this.options.filterFields || []) {
      if (query[field]) {
        where[field] = query[field];
      }
    }

    if (query.search && this.options.searchFields?.length) {
      where.OR = this.options.searchFields.map((field) => ({
        [field]: { contains: query.search },
      }));
    }

    if (this.options.softDelete !== false) {
      return withNotDeleted(where);
    }

    return where;
  }

  pickAllowed(payload, options = {}) {
    const data = {};
    const allowedFields = this.options.allowedFields || [];
    const bigIntFields = this.options.bigIntFields || [];
    const dateFields = this.options.dateFields || [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        const value = payload[field];
        if (bigIntFields.includes(field) && value !== null && value !== undefined && value !== "") {
          data[field] = BigInt(Math.trunc(Number(value)));
        } else if (dateFields.includes(field) && value !== null && value !== undefined && value !== "") {
          data[field] = new Date(value);
        } else {
          data[field] = value;
        }
      }
    }

    if (options.companyId && this.options.scopedByCompany !== false) {
      data.companyId = options.companyId;
    }

    return data;
  }

  validateRequired(payload, requiredFields = []) {
    for (const field of requiredFields) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        const error = new Error(`${field} is required`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  requireId(id) {
    if (!id) {
      const error = new Error("id is required");
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = { CrudService };
