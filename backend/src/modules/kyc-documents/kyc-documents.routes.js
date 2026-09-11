const { createCrudRoutes } = require("../../shared/create-crud-routes");

const kycDocumentRoutes = createCrudRoutes({
  modelName: "kycDocument",
  resourceName: "KYC document",
  softDelete: false,
  filterFields: ["applicantId", "type", "verified"],
  requiredFields: ["companyId", "applicantId", "type", "fileKey"],
  allowedFields: ["companyId", "applicantId", "type", "fileKey", "fileName", "sizeBytes", "virusScanned", "verified"],
});

module.exports = { kycDocumentRoutes };
