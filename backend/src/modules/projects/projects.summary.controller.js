const { ProjectsSummaryService } = require("./projects.summary.service");

class ProjectsSummaryController {
  constructor(service = new ProjectsSummaryService()) {
    this.service = service;
  }

  summary = async (req, res, next) => {
    try {
      const data = await this.service.summary(req.query.companyId);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { ProjectsSummaryController };
