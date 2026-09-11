const { createCrudRoutes } = require("../../shared/create-crud-routes");

const floorRoutes = createCrudRoutes({
  modelName: "floor",
  resourceName: "Floor",
  filterFields: ["blockId", "number"],
  requiredFields: ["companyId", "blockId", "number"],
  allowedFields: ["companyId", "blockId", "number", "name"],
});

module.exports = { floorRoutes };
