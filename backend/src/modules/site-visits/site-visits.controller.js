const { SiteVisitsService } = require("./site-visits.service");

class SiteVisitsController {
  constructor(service = new SiteVisitsService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      res.json({ data: await this.service.list(req.query, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  count = async (req, res, next) => {
    try {
      res.json({ data: await this.service.count(req.query, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const visit = await this.service.getById(req.query.companyId, req.params.id);
      if (!visit) return res.status(404).json({ error: { message: "Site visit not found" } });
      return res.json({ data: visit });
    } catch (error) {
      return next(error);
    }
  };

  schedule = async (req, res, next) => {
    try {
      res.status(201).json({ data: await this.service.schedule(req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  confirm = async (req, res, next) => {
    try {
      res.json({ data: await this.service.confirm(req.query.companyId, req.params.id, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  reschedule = async (req, res, next) => {
    try {
      res.json({ data: await this.service.reschedule(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req, res, next) => {
    try {
      res.json({ data: await this.service.cancel(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  markNoShow = async (req, res, next) => {
    try {
      res.json({ data: await this.service.markNoShow(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  checkIn = async (req, res, next) => {
    try {
      res.json({ data: await this.service.checkIn(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };

  outcome = async (req, res, next) => {
    try {
      res.status(201).json({ data: await this.service.recordOutcome(req.query.companyId, req.params.id, req.body, req.auth) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { SiteVisitsController };
