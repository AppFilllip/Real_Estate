const { createCrudRoutes } = require("../../shared/create-crud-routes");

const driverRoutes = createCrudRoutes({
  modelName: "driver",
  resourceName: "Driver",
  filterFields: ["active", "phone"],
  requiredFields: ["companyId", "name", "phone"],
  allowedFields: ["companyId", "name", "phone", "vehicleNumber", "active"],
});

module.exports = { driverRoutes };
