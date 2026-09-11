const { createCrudRoutes } = require("../../shared/create-crud-routes");

const rateCardChargeRoutes = createCrudRoutes({
  modelName: "rateCardCharge",
  resourceName: "Rate card charge",
  scopedByCompany: false,
  softDelete: false,
  filterFields: ["rateCardId", "basis"],
  requiredFields: ["rateCardId", "name", "basis", "amount"],
  allowedFields: ["rateCardId", "name", "basis", "amount", "taxable", "gstPct", "sortOrder"],
  orderBy: { sortOrder: "asc" },
});

module.exports = { rateCardChargeRoutes };
