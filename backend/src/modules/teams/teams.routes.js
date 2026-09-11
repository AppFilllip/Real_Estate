const { createCrudRoutes } = require("../../shared/create-crud-routes");

const teamRoutes = createCrudRoutes({
  modelName: "team",
  resourceName: "Team",
  filterFields: ["name", "parentId", "leadUserId"],
  searchFields: ["name"],
  requiredFields: ["companyId", "name"],
  allowedFields: ["companyId", "name", "parentId", "leadUserId", "targetsJson"],
});

module.exports = { teamRoutes };
