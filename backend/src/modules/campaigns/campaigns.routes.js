const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { CampaignsSummaryController } = require("./campaigns.summary.controller");

const campaignRoutes = Router();
const summaryController = new CampaignsSummaryController();

campaignRoutes.get("/summary", summaryController.list);
campaignRoutes.get("/summary/kpis", summaryController.kpis);
campaignRoutes.get("/summary/source-mix", summaryController.sourceMix);

campaignRoutes.use(
  createCrudRoutes({
    modelName: "campaign",
    resourceName: "Campaign",
    filterFields: ["channel", "projectId", "sourceId"],
    searchFields: ["name", "landingPageUrl"],
    requiredFields: ["companyId", "name", "channel"],
    allowedFields: [
      "companyId",
      "projectId",
      "sourceId",
      "name",
      "channel",
      "startDate",
      "endDate",
      "budget",
      "spend",
      "utmJson",
      "landingPageUrl",
      "trackingNumberId",
    ],
    bigIntFields: ["budget", "spend"],
    dateFields: ["startDate", "endDate"],
  })
);

module.exports = { campaignRoutes };
