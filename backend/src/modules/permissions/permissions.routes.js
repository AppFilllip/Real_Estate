const { createCrudRoutes } = require("../../shared/create-crud-routes");

const permissionRoutes = createCrudRoutes({
  modelName: "permission",
  resourceName: "Permission",
  softDelete: false,
  filterFields: ["roleId", "resource", "action", "scope"],
  requiredFields: ["roleId", "resource", "action"],
  allowedFields: ["roleId", "resource", "action", "scope", "allowed"],
});

module.exports = { permissionRoutes };
