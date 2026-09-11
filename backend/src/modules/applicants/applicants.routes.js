const { createCrudRoutes } = require("../../shared/create-crud-routes");

const applicantRoutes = createCrudRoutes({
  modelName: "applicant",
  resourceName: "Applicant",
  softDelete: false,
  filterFields: ["bookingId", "phone"],
  requiredFields: ["companyId", "bookingId", "name", "phone"],
  allowedFields: [
    "companyId", "bookingId", "isPrimary", "relationship", "name", "fatherOrHusbandName",
    "dob", "gender", "maritalStatus", "nationality", "isNri", "panEncrypted", "panLast4",
    "aadhaarEncrypted", "aadhaarLast4", "phone", "email", "occupation", "employer",
    "currentAddress", "permanentAddress", "photoUrl", "kycVerified", "kycVerifiedBy", "kycVerifiedAt",
  ],
});

module.exports = { applicantRoutes };
