const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");

const approvalRequestRoutes = createCrudRoutes({
  modelName: "approvalRequest",
  resourceName: "Approval request",
  softDelete: false,
  filterFields: ["status", "type", "approverId", "entityType", "entityId"],
  requiredFields: ["companyId", "type", "entityType", "entityId", "requestedById"],
  allowedFields: ["companyId", "type", "status", "entityType", "entityId", "requestedAmount", "requestedPct", "justification", "attachmentsJson", "contextJson", "requestedById", "approverId", "slaDueAt"],
});

approvalRequestRoutes.patch("/:id/approve", async (req, res, next) => {
  try {
    const row = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", decisionNote: req.body.decisionNote, decidedAt: new Date() },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

approvalRequestRoutes.patch("/:id/reject", async (req, res, next) => {
  try {
    const row = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", decisionNote: req.body.decisionNote, decidedAt: new Date() },
    });
    res.json({ data: row });
  } catch (error) {
    next(error);
  }
});

module.exports = { approvalRequestRoutes };
