const { createCrudRoutes } = require("../../shared/create-crud-routes");

const plcRoutes = createCrudRoutes({
  modelName: "plc",
  resourceName: "PLC",
  softDelete: false,
  filterFields: ["projectId", "active", "attributeKey"],
  requiredFields: ["companyId", "projectId", "name", "attributeKey", "type", "value"],
  allowedFields: ["companyId", "projectId", "name", "attributeKey", "type", "value", "active"],
});

module.exports = { plcRoutes };
