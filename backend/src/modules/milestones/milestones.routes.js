const { createCrudRoutes } = require("../../shared/create-crud-routes");

const milestoneRoutes = createCrudRoutes({
  modelName: "milestone",
  resourceName: "Milestone",
  softDelete: false,
  filterFields: ["projectId", "status"],
  requiredFields: ["companyId", "projectId", "name"],
  allowedFields: ["companyId", "projectId", "name", "sortOrder", "plannedDate", "actualDate", "status", "photosJson", "completedById"],
});

module.exports = { milestoneRoutes };
