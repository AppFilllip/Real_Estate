const { randomUUID } = require("crypto");
const { Router } = require("express");
const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");

const messageRoutes = Router();

messageRoutes.get("/", async (req, res, next) => {
  try {
    const { companyId, conversationId } = req.query;
    if (!companyId || !conversationId) throw httpError(400, "companyId and conversationId are required");

    const messages = await prisma.message.findMany({
      where: { companyId, conversationId },
      orderBy: { createdAt: "asc" },
      take: Math.min(Number(req.query.take || 100), 200),
    });
    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
});

messageRoutes.post("/", async (req, res, next) => {
  try {
    for (const field of ["companyId", "conversationId", "body"]) {
      if (!req.body[field]) throw httpError(400, `${field} is required`);
    }

    const message = await prisma.message.create({
      data: {
        companyId: req.body.companyId,
        conversationId: req.body.conversationId,
        direction: "OUTBOUND",
        status: "SENT",
        body: req.body.body,
        isInternalNote: Boolean(req.body.isInternalNote),
        sentAt: new Date(),
        // (companyId, providerMessageId) is a non-sparse unique index — Mongo
        // treats multiple nulls as a collision, so a locally-composed message
        // needs its own synthetic idempotency key.
        providerMessageId: `local-${randomUUID()}`,
      },
    });

    await prisma.conversation.update({
      where: { id: req.body.conversationId },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
});

module.exports = { messageRoutes };
