const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { CustomersSummaryController } = require("./customers.summary.controller");

const customerRoutes = Router();
const summaryController = new CustomersSummaryController();

customerRoutes.get("/summary/kpis", summaryController.kpis);
customerRoutes.get("/summary", summaryController.list);

customerRoutes.use(
  createCrudRoutes({
    modelName: "customer",
    resourceName: "Customer",
    filterFields: ["phone", "email"],
    searchFields: ["name", "phone", "email", "panLast4"],
    requiredFields: ["companyId", "name", "phone"],
    allowedFields: [
      "companyId",
      "name",
      "phone",
      "email",
      "panEncrypted",
      "panLast4",
      "addressJson",
      "portalAccessEnabled",
      "relationshipManagerId",
      "referredByCustomerId",
    ],
  })
);

module.exports = { customerRoutes };
