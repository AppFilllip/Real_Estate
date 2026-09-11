const { CustomersSummaryService } = require("./customers.summary.service");

class CustomersSummaryController {
  constructor(service = new CustomersSummaryService()) {
    this.service = service;
  }

  kpis = async (req, res, next) => {
    try {
      const data = await this.service.kpis(req.query.companyId);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };

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
}

module.exports = { CustomersSummaryController };
