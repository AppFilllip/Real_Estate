const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { ProjectsSummaryController } = require("./projects.summary.controller");

const projectRoutes = Router();
const summaryController = new ProjectsSummaryController();

projectRoutes.get("/summary", summaryController.summary);

projectRoutes.use(
  createCrudRoutes({
    modelName: "project",
    resourceName: "Project",
    filterFields: ["status", "type", "city"],
    searchFields: ["name", "shortCode", "developerName", "city", "state", "reraNumber"],
    requiredFields: ["companyId", "name", "shortCode", "ownershipType", "type"],
    allowedFields: [
      "companyId",
      "name",
      "shortCode",
      "ownershipType",
      "developerName",
      "type",
      "status",
      "description",
      "coverImageUrl",
      "brochureUrl",
      "layoutPlanUrl",
      "city",
      "state",
      "pincode",
      "latitude",
      "longitude",
      "reraNumber",
      "possessionDate",
      "launchDate",
      "hierarchyTemplate",
    ],
  })
);

module.exports = { projectRoutes };
