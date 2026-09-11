const { createCrudRoutes } = require("../../shared/create-crud-routes");

const ticketRoutes = createCrudRoutes({
  modelName: "ticket",
  resourceName: "Ticket",
  filterFields: ["status", "priority", "category", "customerId", "bookingId", "assigneeId"],
  requiredFields: ["companyId", "ticketNumber", "category", "subject"],
  allowedFields: ["companyId", "customerId", "bookingId", "ticketNumber", "category", "priority", "status", "subject", "body", "slaDueAt", "resolvedAt", "attachmentsJson", "assigneeId"],
});

module.exports = { ticketRoutes };
