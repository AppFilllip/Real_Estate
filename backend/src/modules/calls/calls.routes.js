const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { CallsSummaryController } = require("./calls.summary.controller");
const dialController = require("./calls.dial.controller");

const callRoutes = Router();
const summaryController = new CallsSummaryController();

callRoutes.get("/summary", summaryController.list);
callRoutes.get("/missed-queue", summaryController.missedQueue);
callRoutes.get("/numbers", summaryController.numbers);
callRoutes.post("/dial", dialController.dial);

callRoutes.use(
  createCrudRoutes({
    modelName: "call",
    resourceName: "Call",
    softDelete: false,
    filterFields: ["status", "direction", "agentId", "leadId", "customerId"],
    searchFields: ["fromNumber", "toNumber", "ivrPath", "dispositionNote", "providerCallSid"],
    requiredFields: ["companyId", "direction", "fromNumber", "toNumber"],
    allowedFields: [
      "companyId",
      "leadId",
      "customerId",
      "phoneNumberId",
      "direction",
      "status",
      "fromNumber",
      "toNumber",
      "agentId",
      "ivrPath",
      "dtmfJson",
      "ringSeconds",
      "talkSeconds",
      "startedAt",
      "answeredAt",
      "endedAt",
      "costPaise",
      "disposition",
      "dispositionNote",
      "dispositionDueAt",
      "providerCallSid",
    ],
    bigIntFields: ["costPaise"],
    dateFields: ["startedAt", "answeredAt", "endedAt", "dispositionDueAt"],
  })
);

module.exports = { callRoutes };
