const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");

const commissionRoutes = createCrudRoutes({
  modelName: "commission",
  resourceName: "Commission",
  softDelete: false,
  filterFields: ["brokerId", "bookingId", "status"],
  requiredFields: ["companyId", "brokerId", "bookingId", "agreementValue", "amount"],
  allowedFields: [
    "companyId", "brokerId", "bookingId", "agreementValue", "brokeragePct",
    "amount", "status", "payableTrigger", "invoiceUrl", "invoiceNumber",
    "tdsAmount", "clawbackReason",
  ],
});

commissionRoutes.patch("/:id/approve", async (req, res, next) => {
  try {
    const row = await prisma.commission.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", approvedById: req.auth && req.auth.sub, approvedAt: new Date() },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

commissionRoutes.patch("/:id/paid", async (req, res, next) => {
  try {
    const row = await prisma.commission.update({
      where: { id: req.params.id },
      data: { status: "PAID", paidOn: new Date(), utr: req.body.utr, tdsAmount: req.body.tdsAmount },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

commissionRoutes.patch("/:id/clawback", async (req, res, next) => {
  try {
    const row = await prisma.commission.update({
      where: { id: req.params.id },
      data: { status: "CLAWED_BACK", clawbackReason: req.body.clawbackReason },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

module.exports = { commissionRoutes };
