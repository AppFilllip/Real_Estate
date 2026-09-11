const { Router } = require("express");
const { prisma } = require("../../db/prisma");
const { withNotDeleted } = require("../../utils/not-deleted");
const { resolveOwnerScope } = require("../../utils/scope");

const bookingRoutes = Router();

bookingRoutes.get("/", async (req, res, next) => {
  try {
    const search = req.query.search;
    const ownerIds = await resolveOwnerScope(req.auth);
    const rows = await prisma.booking.findMany({
      where: withNotDeleted({
        companyId: req.query.companyId,
        ...(req.query.status ? { status: req.query.status } : {}),
        ...(req.query.customerId ? { customerId: req.query.customerId } : {}),
        ...(req.query.salesExecId ? { salesExecId: req.query.salesExecId } : ownerIds ? { salesExecId: { in: ownerIds } } : {}),
        ...(search
          ? {
              OR: [
                { bookingNumber: { contains: search } },
                { bankName: { contains: search } },
                { cancelReason: { contains: search } },
              ],
            }
          : {}),
      }),
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        unit: { select: { id: true, unitCode: true } },
      },
    });
    res.json({ data: rows });
  } catch (error) { next(error); }
});

const RECEIVED_RECEIPT_STATUSES = ["RECORDED", "PENDING_CLEARANCE", "CLEARED"];

bookingRoutes.get("/summary", async (req, res, next) => {
  try {
    const companyId = req.query.companyId;
    const take = Math.min(Number(req.query.take || 25), 100);
    const skip = Number(req.query.skip || 0);
    const ownerIds = await resolveOwnerScope(req.auth);
    const where = withNotDeleted({
      companyId,
      ...(req.query.status ? { status: req.query.status } : {}),
      ...(req.query.salesExecId ? { salesExecId: req.query.salesExecId } : ownerIds ? { salesExecId: { in: ownerIds } } : {}),
      ...(req.query.bookedFrom || req.query.bookedTo
        ? {
            bookedOn: {
              ...(req.query.bookedFrom ? { gte: new Date(req.query.bookedFrom) } : {}),
              ...(req.query.bookedTo ? { lte: new Date(req.query.bookedTo) } : {}),
            },
          }
        : {}),
      ...(req.query.search
        ? { bookingNumber: { contains: req.query.search, mode: "insensitive" } }
        : {}),
    });

    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { bookedOn: "desc" },
        include: {
          customer: { select: { id: true, name: true } },
          unit: { select: { id: true, unitCode: true } },
          project: { select: { id: true, name: true } },
          broker: { select: { id: true, firmName: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const receiptSums = rows.length
      ? await prisma.receipt.groupBy({
          by: ["bookingId"],
          where: { companyId, bookingId: { in: rows.map((row) => row.id) }, status: { in: RECEIVED_RECEIPT_STATUSES } },
          _sum: { amount: true },
        })
      : [];
    const receivedByBooking = new Map(receiptSums.map((row) => [row.bookingId, row._sum.amount || 0n]));

    const data = rows.map((row) => {
      const received = receivedByBooking.get(row.id) || 0n;
      const collectedPercent = row.agreementValue > 0n ? Number((received * 100n) / row.agreementValue) : 0;
      return {
        id: row.id,
        bookingNumber: row.bookingNumber,
        status: row.status,
        agreementValue: row.agreementValue,
        bookedOn: row.bookedOn,
        customerName: row.customer?.name || null,
        unitCode: row.unit?.unitCode || null,
        projectName: row.project?.name || null,
        brokerName: row.broker?.firmName || null,
        received,
        collectedPercent,
      };
    });

    res.json({ data: { data, total } });
  } catch (error) {
    next(error);
  }
});

bookingRoutes.get("/:id", async (req, res, next) => {
  try {
    const row = await prisma.booking.findFirst({
      where: withNotDeleted({ id: req.params.id, companyId: req.query.companyId }),
      include: { project: true, unit: true, lead: true, customer: true, broker: true, receipts: true, demands: true },
    });
    if (!row) return res.status(404).json({ error: { message: "Booking not found" } });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

bookingRoutes.post("/", async (req, res, next) => {
  try {
    for (const f of ["companyId", "projectId", "unitId", "bookingNumber", "agreementValue"]) if (!req.body[f]) throw Object.assign(new Error(`${f} is required`), { statusCode: 400 });
    const row = await prisma.booking.create({
      data: {
        companyId: req.body.companyId, projectId: req.body.projectId, unitId: req.body.unitId, leadId: req.body.leadId,
        tokenId: req.body.tokenId, customerId: req.body.customerId, bookingNumber: req.body.bookingNumber,
        status: req.body.status || "DRAFT", agreementValue: req.body.agreementValue, discountAmount: req.body.discountAmount,
        lockedPriceJson: req.body.lockedPriceJson, brokerId: req.body.brokerId, brokeragePct: req.body.brokeragePct,
        brokerageAmount: req.body.brokerageAmount, fundingType: req.body.fundingType, bankName: req.body.bankName,
        loanAmount: req.body.loanAmount, loanStatus: req.body.loanStatus, salesExecId: req.body.salesExecId, createdById: req.auth && req.auth.sub,
      },
    });
    res.status(201).json({ data: row });
  } catch (error) { next(error); }
});

bookingRoutes.patch("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.booking.findFirst({ where: withNotDeleted({ id: req.params.id, companyId: req.query.companyId }) });
    if (!existing) return res.status(404).json({ error: { message: "Booking not found" } });

    const data = {};
    for (const field of [
      "leadId",
      "customerId",
      "brokerId",
      "bookingNumber",
      "agreementValue",
      "discountAmount",
      "lockedPriceJson",
      "brokeragePct",
      "brokerageAmount",
      "fundingType",
      "bankName",
      "loanAmount",
      "loanStatus",
      "salesExecId",
    ]) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) data[field] = req.body[field];
    }

    const row = await prisma.booking.update({ where: { id: req.params.id }, data });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

bookingRoutes.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.booking.findFirst({ where: withNotDeleted({ id: req.params.id, companyId: req.query.companyId }) });
    if (!existing) return res.status(404).json({ error: { message: "Booking not found" } });

    const row = await prisma.booking.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return res.json({ data: row });
  } catch (error) { return next(error); }
});

bookingRoutes.patch("/:id/submit", async (req, res, next) => {
  try {
    const row = await prisma.booking.update({ where: { id: req.params.id }, data: { status: "PENDING_APPROVAL" } });
    res.json({ data: row });
  } catch (error) { next(error); }
});

bookingRoutes.patch("/:id/approve", async (req, res, next) => {
  try {
    const row = await prisma.booking.update({ where: { id: req.params.id }, data: { status: "BOOKED", bookedOn: new Date(), approvedById: req.auth && req.auth.sub, approvedAt: new Date() } });
    await prisma.unit.update({ where: { id: row.unitId }, data: { status: "BOOKED", version: { increment: 1 } } });
    if (row.leadId) await prisma.lead.update({ where: { id: row.leadId }, data: { stage: "BOOKED", lastActivityAt: new Date() } });
    if (row.tokenId) await prisma.token.update({ where: { id: row.tokenId }, data: { status: "CONVERTED" } });
    res.json({ data: row });
  } catch (error) { next(error); }
});

bookingRoutes.patch("/:id/cancel", async (req, res, next) => {
  try {
    const row = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED", cancelledOn: new Date(), cancelReason: req.body.cancelReason, cancelRequestedBy: req.auth && req.auth.sub, cancellationCharges: req.body.cancellationCharges, refundAmount: req.body.refundAmount },
    });
    await prisma.unit.update({ where: { id: row.unitId }, data: { status: "AVAILABLE", isReReleased: true, availableSince: new Date(), version: { increment: 1 } } });
    res.json({ data: row });
  } catch (error) { next(error); }
});

module.exports = { bookingRoutes };
