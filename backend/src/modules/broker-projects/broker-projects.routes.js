const { createCrudRoutes } = require("../../shared/create-crud-routes");

const brokerProjectRoutes = createCrudRoutes({
  modelName: "brokerProject",
  resourceName: "Broker project",
  softDelete: false,
  filterFields: ["brokerId", "projectId", "active"],
  requiredFields: ["companyId", "brokerId", "projectId"],
  allowedFields: ["companyId", "brokerId", "projectId", "brokeragePct", "active"],
});

module.exports = { brokerProjectRoutes };
