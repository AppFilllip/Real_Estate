const { BrokersSummaryService } = require("./brokers.summary.service");

class BrokersSummaryController {
  constructor(service = new BrokersSummaryService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const result = await this.service.list({
        companyId: req.query.companyId,
        skip: Number(req.query.skip || 0),
        take: Math.min(Number(req.query.take || 25), 100),
      });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { BrokersSummaryController };
