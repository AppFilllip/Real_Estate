const { createCrudRoutes } = require("../../shared/create-crud-routes");

const companyRoutes = createCrudRoutes({
  modelName: "company",
  resourceName: "Company",
  scopedByCompany: false,
  filterFields: ["shortCode"],
  searchFields: ["name", "legalName", "shortCode", "gstin", "pan", "reraPromoterNo"],
  requiredFields: ["name", "shortCode"],
  allowedFields: [
    "name",
    "legalName",
    "shortCode",
    "logoUrl",
    "letterheadUrl",
    "gstin",
    "pan",
    "reraPromoterNo",
    "addressJson",
    "settingsJson",
  ],
});

module.exports = { companyRoutes };
