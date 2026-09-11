const { Router } = require("express");
const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");

const demandRoutes = Router();

function required(body, fields) {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      const error = new Error(`${field} is required`);
      error.statusCode = 400;
      throw error;
    }
  }
}

demandRoutes.get("/", async (req, res, next) => {
  try {
    const rows = await prisma.demand.findMany({
      where: withNotDeleted({
        companyId: req.query.companyId,
        ...(req.query.bookingId ? { bookingId: req.query.bookingId } : {}),
        ...(req.query.status ? { status: req.query.status } : {}),
      }),
      orderBy: { dueDate: "asc" },
    });
    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

demandRoutes.post("/", async (req, res, next) => {
  try {
    required(req.body, ["companyId", "bookingId", "demandNumber", "sequenceNo", "label", "amount", "dueDate"]);
    const demand = await prisma.demand.create({
      data: {
        companyId: req.body.companyId,
        bookingId: req.body.bookingId,
        milestoneId: req.body.milestoneId,
        demandNumber: req.body.demandNumber,
        sequenceNo: req.body.sequenceNo,
        label: req.body.label,
        pctOfValue: req.body.pctOfValue,
        amount: req.body.amount,
        dueDate: new Date(req.body.dueDate),
        graceDays: req.body.graceDays,
        interestPctPa: req.body.interestPctPa,
        status: req.body.status,
      },
    });
    await prisma.ledger.create({
      data: {
        companyId: demand.companyId,
        bookingId: demand.bookingId,
        entryDate: new Date(),
        particulars: `Demand ${demand.demandNumber}`,
        type: "DEBIT",
        amount: demand.amount,
        balance: demand.amount,
        sourceType: "DEMAND",
        sourceId: demand.id,
      },
    });
    res.status(201).json({ data: demand });
  } catch (error) {
    next(error);
  }
});

demandRoutes.patch("/:id/waive", async (req, res, next) => {
  try {
    const demand = await prisma.demand.update({
      where: { id: req.params.id },
      data: { status: "WAIVED", interestWaived: req.body.interestWaived || 0n, waivedReason: req.body.waivedReason },
    });
    res.json({ data: demand });
  } catch (error) {
    next(error);
  }
});

module.exports = { demandRoutes };
