const { createCrudRoutes } = require("../../shared/create-crud-routes");

const paymentPlanTemplateRoutes = createCrudRoutes({
  modelName: "paymentPlanTemplate",
  resourceName: "Payment plan template",
  filterFields: ["projectId", "active", "type"],
  requiredFields: ["companyId", "name", "type", "rowsJson"],
  allowedFields: ["companyId", "projectId", "name", "type", "rowsJson", "active"],
});

module.exports = { paymentPlanTemplateRoutes };
