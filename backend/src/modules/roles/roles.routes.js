const { createCrudRoutes } = require("../../shared/create-crud-routes");

const roleRoutes = createCrudRoutes({
  modelName: "role",
  resourceName: "Role",
  filterFields: ["code", "name"],
  searchFields: ["code", "name"],
  requiredFields: ["companyId", "code", "name", "permissionsJson"],
  allowedFields: ["companyId", "code", "name", "isSystem", "permissionsJson"],
});

module.exports = { roleRoutes };
