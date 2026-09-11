const { createCrudRoutes } = require("../../shared/create-crud-routes");

const rateCardRoutes = createCrudRoutes({
  modelName: "rateCard",
  resourceName: "Rate card",
  filterFields: ["projectId", "status"],
  requiredFields: ["companyId", "projectId", "version", "pricingBasis", "baseRate"],
  allowedFields: [
    "companyId",
    "projectId",
    "version",
    "status",
    "effectiveFrom",
    "pricingBasis",
    "baseRate",
    "stampDutyMalePct",
    "stampDutyFemalePct",
    "registrationPct",
    "publishedAt",
    "publishedById",
    "createdById",
  ],
});

module.exports = { rateCardRoutes };
