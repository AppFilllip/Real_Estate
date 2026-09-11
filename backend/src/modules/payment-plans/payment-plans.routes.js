const { createCrudRoutes } = require("../../shared/create-crud-routes");

const paymentPlanRoutes = createCrudRoutes({
  modelName: "paymentPlan",
  resourceName: "Payment plan",
  softDelete: false,
  filterFields: ["bookingId", "templateId", "type"],
  requiredFields: ["companyId", "bookingId", "type", "rowsJson"],
  allowedFields: ["companyId", "bookingId", "templateId", "type", "rowsJson"],
});

module.exports = { paymentPlanRoutes };
