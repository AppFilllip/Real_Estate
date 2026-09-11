const { ReportsService } = require("./reports.service");

class ReportsController {
  constructor(service = new ReportsService()) {
    this.service = service;
  }

  dashboard = async (req, res, next) => {
    try {
      res.json({ data: await this.service.dashboard(req.query) });
    } catch (error) {
      next(error);
    }
  };

  leads = async (req, res, next) => {
    try {
      res.json({ data: await this.service.leads(req.query) });
    } catch (error) {
      next(error);
    }
  };

  inventory = async (req, res, next) => {
    try {
      res.json({ data: await this.service.inventory(req.query) });
    } catch (error) {
      next(error);
    }
  };

  sales = async (req, res, next) => {
    try {
      res.json({ data: await this.service.sales(req.query) });
    } catch (error) {
      next(error);
    }
  };

  collections = async (req, res, next) => {
    try {
      res.json({ data: await this.service.collections(req.query) });
    } catch (error) {
      next(error);
    }
  };

  brokers = async (req, res, next) => {
    try {
      res.json({ data: await this.service.brokers(req.query) });
    } catch (error) {
      next(error);
    }
  };

  execPerformance = async (req, res, next) => {
    try {
      res.json({ data: await this.service.execPerformance(req.query) });
    } catch (error) {
      next(error);
    }
  };

  stageConversion = async (req, res, next) => {
    try {
      res.json({ data: await this.service.stageConversion(req.query) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { ReportsController };
