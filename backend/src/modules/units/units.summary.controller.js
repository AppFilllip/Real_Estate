const { UnitsSummaryService } = require("./units.summary.service");

class UnitsSummaryController {
  constructor(service = new UnitsSummaryService()) {
    this.service = service;
  }

  summary = async (req, res, next) => {
    try {
      const data = await this.service.summary(req.query.companyId, req.query.projectId);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { UnitsSummaryController };
