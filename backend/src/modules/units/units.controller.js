const { UnitsService } = require("./units.service");

class UnitsController {
  constructor(service = new UnitsService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      res.json({ data: await this.service.list(req.query) });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const unit = await this.service.getById(req.query.companyId, req.params.id);
      if (!unit) return res.status(404).json({ error: { message: "Unit not found" } });
      return res.json({ data: unit });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ data: await this.service.create(req.body) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      res.json({ data: await this.service.update(req.query.companyId, req.params.id, req.body) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      res.json({ data: await this.service.remove(req.query.companyId, req.params.id) });
    } catch (error) {
      next(error);
    }
  };

  changeStatus = async (req, res, next) => {
    try {
      res.json({ data: await this.service.changeStatus(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { UnitsController };
