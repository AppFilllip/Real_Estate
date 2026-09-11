const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");

const refundRoutes = createCrudRoutes({
  modelName: "refund",
  resourceName: "Refund",
  softDelete: false,
  filterFields: ["bookingId", "status"],
  requiredFields: ["companyId", "bookingId", "amount"],
  allowedFields: ["companyId", "bookingId", "amount", "tdsAmount", "status", "mode", "expectedDate", "paidOn", "utr", "reason", "requestLetterUrl", "requestedById", "approvedById", "approvedAt"],
});

refundRoutes.patch("/:id/approve", async (req, res, next) => {
  try {
    const row = await prisma.refund.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", approvedById: req.auth && req.auth.sub, approvedAt: new Date() },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

refundRoutes.patch("/:id/paid", async (req, res, next) => {
  try {
    const row = await prisma.refund.update({
      where: { id: req.params.id },
      data: { status: "PAID", paidOn: new Date(), mode: req.body.mode, utr: req.body.utr },
    });
    await prisma.ledger.create({
      data: {
        companyId: row.companyId,
        bookingId: row.bookingId,
        entryDate: row.paidOn || new Date(),
        particulars: "Refund paid",
        type: "DEBIT",
        amount: row.amount,
        balance: 0n,
        sourceType: "REFUND",
        sourceId: row.id,
      },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

module.exports = { refundRoutes };
