const { CollectionsService } = require("./collections.service");

class CollectionsController {
  constructor(service = new CollectionsService()) {
    this.service = service;
  }

  summary = async (req, res, next) => {
    try {
      res.json({ data: await this.service.summary(req.query) });
    } catch (error) {
      next(error);
    }
  };

  outstanding = async (req, res, next) => {
    try {
      res.json({ data: await this.service.outstanding(req.query) });
    } catch (error) {
      next(error);
    }
  };

  ageing = async (req, res, next) => {
    try {
      res.json({ data: await this.service.ageing(req.query) });
    } catch (error) {
      next(error);
    }
  };

  dueSoon = async (req, res, next) => {
    try {
      res.json({ data: await this.service.dueSoon(req.query) });
    } catch (error) {
      next(error);
    }
  };

  cheques = async (req, res, next) => {
    try {
      res.json({ data: await this.service.cheques(req.query) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { CollectionsController };
