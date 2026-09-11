const { createCrudRoutes } = require("../../shared/create-crud-routes");

const ledgerRoutes = createCrudRoutes({
  modelName: "ledger",
  resourceName: "Ledger entry",
  softDelete: false,
  filterFields: ["bookingId", "type", "sourceType"],
  requiredFields: ["companyId", "bookingId", "entryDate", "particulars", "type", "amount", "balance"],
  allowedFields: ["companyId", "bookingId", "entryDate", "particulars", "type", "amount", "balance", "sourceType", "sourceId"],
});

module.exports = { ledgerRoutes };
