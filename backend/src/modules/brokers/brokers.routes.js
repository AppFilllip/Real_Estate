const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");
const { BrokersSummaryController } = require("./brokers.summary.controller");

const brokerRoutes = Router();
const summaryController = new BrokersSummaryController();

brokerRoutes.get("/summary", summaryController.list);

brokerRoutes.use(
  createCrudRoutes({
    modelName: "broker",
    resourceName: "Broker",
    filterFields: ["status", "tier", "phone"],
    searchFields: ["firmName", "contactPerson", "phone", "email", "reraAgentNo", "gstNumber"],
    requiredFields: ["companyId", "contactPerson", "phone"],
    allowedFields: [
      "companyId", "firmName", "contactPerson", "phone", "email", "reraAgentNo",
      "panEncrypted", "gstNumber", "address", "bankAccountNameEncrypted",
      "bankAccountNumberEncrypted", "bankIfscEncrypted", "tier", "status",
      "leadProtectionDays", "portalAccessEnabled", "portalPasswordHash",
      "documentsJson", "agreementSignedOn",
    ],
  })
);

brokerRoutes.patch("/:id/activate", async (req, res, next) => {
  try {
    const broker = await prisma.broker.update({
      where: { id: req.params.id },
      data: { status: "ACTIVE", portalAccessEnabled: req.body.portalAccessEnabled ?? true },
    });
    res.json({ data: broker });
  } catch (error) {
    next(error);
  }
});

brokerRoutes.patch("/:id/suspend", async (req, res, next) => {
  try {
    const broker = await prisma.broker.update({
      where: { id: req.params.id },
      data: { status: "SUSPENDED", portalAccessEnabled: false },
    });
    res.json({ data: broker });
  } catch (error) {
    next(error);
  }
});

module.exports = { brokerRoutes };
