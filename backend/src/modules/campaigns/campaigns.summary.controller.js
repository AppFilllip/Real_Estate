const { CampaignsSummaryService } = require("./campaigns.summary.service");

class CampaignsSummaryController {
  constructor(service = new CampaignsSummaryService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const result = await this.service.list({
        companyId: req.query.companyId,
        skip: Number(req.query.skip || 0),
        take: Math.min(Number(req.query.take || 25), 100),
        projectId: req.query.projectId || undefined,
        paidOnly: req.query.paidOnly === "true",
      });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  };

  kpis = async (req, res, next) => {
    try {
      res.json({ data: await this.service.kpis(req.query.companyId) });
    } catch (error) {
      next(error);
    }
  };

  sourceMix = async (req, res, next) => {
    try {
      res.json({ data: await this.service.sourceMix(req.query.companyId) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { CampaignsSummaryController };
