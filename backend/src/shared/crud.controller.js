class CrudController {
  constructor(service, resourceName) {
    this.service = service;
    this.resourceName = resourceName;
  }

  list = async (req, res, next) => {
    try {
      const rows = await this.service.list(req.query);
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const row = await this.service.getById(req.query.companyId, req.params.id);

      if (!row) {
        return res.status(404).json({ error: { message: `${this.resourceName} not found` } });
      }

      return res.json({ data: row });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const row = await this.service.create(req.body);
      res.status(201).json({ data: row });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const row = await this.service.update(req.query.companyId, req.params.id, req.body);
      res.json({ data: row });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const row = await this.service.remove(req.query.companyId, req.params.id);
      res.json({ data: row });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { CrudController };
