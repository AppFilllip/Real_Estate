const { HoldsService } = require("./holds.service");

class HoldsController {
  constructor(service = new HoldsService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      res.json({ data: await this.service.list(req.query) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      res.status(201).json({ data: await this.service.create(req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  release = async (req, res, next) => {
    try {
      res.json({ data: await this.service.release(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { HoldsController };
