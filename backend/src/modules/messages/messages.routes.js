const { randomUUID } = require("crypto");
const { Router } = require("express");
const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const whatsappService = require("../whatsapp/whatsapp.service");
const emailService = require("../email/email.service");

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

    const isInternalNote = Boolean(req.body.isInternalNote);

    // A real reply (not an internal note) actually goes out through whichever
    // provider that conversation's channel uses — WhatsApp/Email reuse the
    // exact send path the Lead detail screen's buttons use, so the message
    // really leaves the building instead of only being logged locally.
    if (!isInternalNote) {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.body.conversationId, companyId: req.body.companyId },
      });
      if (!conversation) throw httpError(404, "Conversation not found");

      if (conversation.channel === "WHATSAPP") {
        const result = await whatsappService.sendMessage(req.body.companyId, {
          phone: conversation.contactValue,
          leadId: conversation.leadId,
          customerId: conversation.customerId,
          text: req.body.body,
          actorId: req.auth && req.auth.sub,
        });
        return res.status(201).json({ data: result.message, sent: result.sent, error: result.error });
      }

      if (conversation.channel === "EMAIL") {
        const result = await emailService.sendMessage(req.body.companyId, {
          email: conversation.contactValue,
          leadId: conversation.leadId,
          customerId: conversation.customerId,
          subject: req.body.subject || "Re: your enquiry",
          body: req.body.body,
          actorId: req.auth && req.auth.sub,
        });
        return res.status(201).json({ data: result.message, sent: result.sent, error: result.error });
      }
    }

    // Internal notes, and any channel with no real provider behind it (SMS —
    // never built), fall back to a locally-recorded message that was never
    // actually delivered anywhere.
    const message = await prisma.message.create({
      data: {
        companyId: req.body.companyId,
        conversationId: req.body.conversationId,
        direction: "OUTBOUND",
        status: isInternalNote ? "SENT" : "FAILED",
        body: req.body.body,
        isInternalNote,
        senderType: "USER",
        senderId: req.auth && req.auth.sub,
        sentAt: isInternalNote ? new Date() : undefined,
        failureReason: isInternalNote ? undefined : "channel_not_connected",
        // (companyId, providerMessageId) is a unique index — a locally-composed
        // message still needs its own synthetic idempotency key.
        providerMessageId: `local-${randomUUID()}`,
      },
    });

    await prisma.conversation.update({
      where: { id: req.body.conversationId },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json({ data: message, sent: isInternalNote, error: isInternalNote ? undefined : "channel_not_connected" });
  } catch (error) {
    next(error);
  }
});

module.exports = { messageRoutes };
