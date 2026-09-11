const { createCrudRoutes } = require("../../shared/create-crud-routes");

const offerRoutes = createCrudRoutes({
  modelName: "offer",
  resourceName: "Offer",
  filterFields: ["active", "type"],
  requiredFields: ["companyId", "name", "type"],
  allowedFields: ["companyId", "name", "type", "value", "freeItem", "validFrom", "validTo", "projectIdsJson", "autoApply", "active"],
});

module.exports = { offerRoutes };
