const { createCrudRoutes } = require("../../shared/create-crud-routes");

const blockRoutes = createCrudRoutes({
  modelName: "block",
  resourceName: "Block",
  filterFields: ["projectId", "name", "code"],
  requiredFields: ["companyId", "projectId", "name", "code"],
  allowedFields: ["companyId", "projectId", "name", "code", "sortOrder"],
});

module.exports = { blockRoutes };
