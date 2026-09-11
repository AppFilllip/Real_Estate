const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");

const leadDisputeRoutes = createCrudRoutes({
  modelName: "leadDispute",
  resourceName: "Lead dispute",
  softDelete: false,
  filterFields: ["leadId", "brokerAId", "brokerBId", "status"],
  requiredFields: ["companyId", "leadId", "brokerAId"],
  allowedFields: ["companyId", "leadId", "brokerAId", "brokerBId", "status", "awardedToBrokerId", "resolutionNote", "resolvedById", "resolvedAt"],
});

leadDisputeRoutes.patch("/:id/resolve", async (req, res, next) => {
  try {
    const dispute = await prisma.leadDispute.update({
      where: { id: req.params.id },
      data: {
        status: "RESOLVED",
        awardedToBrokerId: req.body.awardedToBrokerId,
        resolutionNote: req.body.resolutionNote,
        resolvedById: req.auth && req.auth.sub,
        resolvedAt: new Date(),
      },
    });

    if (dispute.awardedToBrokerId) {
      await prisma.lead.update({
        where: { id: dispute.leadId },
        data: { brokerId: dispute.awardedToBrokerId },
      });
    }

    res.json({ data: dispute });
  } catch (error) {
    next(error);
  }
});

module.exports = { leadDisputeRoutes };
