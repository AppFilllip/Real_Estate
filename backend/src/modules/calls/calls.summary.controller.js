const { CallsSummaryService } = require("./calls.summary.service");

class CallsSummaryController {
  constructor(service = new CallsSummaryService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const result = await this.service.list({
        companyId: req.query.companyId,
        status: req.query.status,
        skip: Number(req.query.skip || 0),
        take: Math.min(Number(req.query.take || 25), 100),
      });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  missedQueue = async (req, res, next) => {
    try {
      res.json({ data: await this.service.missedQueue(req.query.companyId) });
    } catch (error) {
      next(error);
    }
  };

  numbers = async (req, res, next) => {
    try {
      res.json({ data: await this.service.numbers(req.query.companyId) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { CallsSummaryController };
