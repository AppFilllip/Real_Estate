const { Router } = require("express");
const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");

const conversationRoutes = Router();

conversationRoutes.get("/unread-count", async (req, res, next) => {
  try {
    const count = await prisma.conversation.count({
      where: { companyId: req.query.companyId, unreadCount: { gt: 0 } },
    });
    res.json({ data: { count } });
  } catch (error) {
    next(error);
  }
});

conversationRoutes.use(
  createCrudRoutes({
    modelName: "conversation",
    resourceName: "Conversation",
    softDelete: false,
    filterFields: ["status", "channel", "assigneeId", "leadId", "customerId"],
    searchFields: ["contactValue"],
    requiredFields: ["companyId", "channel", "contactValue"],
    allowedFields: [
      "companyId",
      "leadId",
      "customerId",
      "channel",
      "status",
      "contactValue",
      "assigneeId",
      "lastMessageAt",
      "lastInboundAt",
      "sessionExpiresAt",
      "unreadCount",
      "firstResponseDueAt",
      "closedAt",
    ],
  })
);

module.exports = { conversationRoutes };
