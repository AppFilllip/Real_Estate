const { randomUUID } = require("crypto");
const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const provider = require("./whatsapp.provider");

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000; // §15 — the 24-hour WhatsApp session window

async function resolvePhone({ phone, leadId, customerId }, companyId) {
  if (phone) return phone;

  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) throw httpError(404, "Lead not found");
    return lead.phone;
  }

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
    if (!customer) throw httpError(404, "Customer not found");
    return customer.phone;
  }

  throw httpError(400, "phone, leadId, or customerId is required");
}

async function findOrCreateConversation(companyId, { leadId, customerId, contactValue, assigneeId }) {
  const existing = await prisma.conversation.findFirst({
    where: { companyId, channel: "WHATSAPP", contactValue },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      companyId,
      channel: "WHATSAPP",
      contactValue,
      leadId: leadId || undefined,
      customerId: customerId || undefined,
      assigneeId: assigneeId || undefined,
      status: "OPEN",
    },
  });
}

/**
 * Send an outbound WhatsApp text, recording it as a Message on the matching
 * Conversation regardless of whether the provider send actually succeeds —
 * a failed send still shows up in the thread with status FAILED so an agent
 * can see and retry it.
 */
async function sendMessage(companyId, { leadId, customerId, phone, text, actorId }) {
  if (!text || !text.trim()) throw httpError(400, "text is required");

  const resolvedPhone = await resolvePhone({ phone, leadId, customerId }, companyId);
  if (!resolvedPhone) throw httpError(422, "No phone number on record for this contact");

  const contactValue = provider.normalizeNumber(resolvedPhone);
  const conversation = await findOrCreateConversation(companyId, { leadId, customerId, contactValue });

  const result = await provider.sendText({ to: resolvedPhone, text });

  const message = await prisma.message.create({
    data: {
      companyId,
      conversationId: conversation.id,
      direction: "OUTBOUND",
      status: result.sent ? "SENT" : "FAILED",
      body: text,
      senderType: "USER",
      senderId: actorId || undefined,
      sentAt: result.sent ? new Date() : undefined,
      failureReason: result.sent ? undefined : result.error,
      // (companyId, providerMessageId) is a non-sparse unique index — a
      // failed/unsent send still needs its own synthetic idempotency key.
      providerMessageId: result.providerMessageId || `local-${randomUUID()}`,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      sessionExpiresAt: new Date(Date.now() + SESSION_WINDOW_MS),
    },
  });

  return { message, sent: result.sent, error: result.error };
}

/**
 * Inbound webhook — a message arriving from a customer via the gateway.
 *
 * ADAPT: this assumes a payload shape of { from, text, id, timestamp }.
 * Verify the actual field names against your gateway's real webhook
 * payload/docs and adjust the destructuring below; nothing else needs to
 * change.
 */
async function recordInbound(companyId, payload) {
  const from = payload.from || payload.sender || payload.phone;
  const text = payload.text || payload.body || payload.message;
  const providerMessageId = String(payload.id || payload.messageId || randomUUID());

  if (!from) throw httpError(400, "Webhook payload missing sender");

  const contactValue = provider.normalizeNumber(from);

  const lead = await prisma.lead.findFirst({ where: { companyId, phone: contactValue } });
  const conversation = await findOrCreateConversation(companyId, {
    leadId: lead?.id,
    contactValue,
  });

  const existing = await prisma.message.findUnique({
    where: { companyId_providerMessageId: { companyId, providerMessageId } },
  }).catch(() => null);
  if (existing) return existing; // idempotent — the gateway may redeliver webhooks

  const message = await prisma.message.create({
    data: {
      companyId,
      conversationId: conversation.id,
      direction: "INBOUND",
      status: "DELIVERED",
      body: text || "",
      senderType: lead ? "CUSTOMER" : "SYSTEM",
      deliveredAt: new Date(),
      providerMessageId,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastInboundAt: new Date(),
      sessionExpiresAt: new Date(Date.now() + SESSION_WINDOW_MS),
      unreadCount: { increment: 1 },
    },
  });

  return message;
}

/**
 * Delivery/read status callback for a message we sent earlier.
 * ADAPT: matches the same assumed payload shape as recordInbound.
 */
async function recordStatus(companyId, payload) {
  const providerMessageId = String(payload.id || payload.messageId || "");
  const status = String(payload.status || "").toUpperCase(); // e.g. DELIVERED | READ | FAILED
  if (!providerMessageId || !["DELIVERED", "READ", "FAILED"].includes(status)) return null;

  const message = await prisma.message.findUnique({
    where: { companyId_providerMessageId: { companyId, providerMessageId } },
  }).catch(() => null);
  if (!message) return null;

  const patch = { status };
  if (status === "DELIVERED") patch.deliveredAt = new Date();
  if (status === "READ") patch.readAt = new Date();
  if (status === "FAILED") patch.failureReason = payload.reason || payload.error || "delivery_failed";

  return prisma.message.update({ where: { id: message.id }, data: patch });
}

function getStatus() {
  return {
    configured: provider.isConfigured(),
    tokenExpiresAt: provider.tokenExpiresAt(),
    tokenExpired: provider.isTokenExpired(),
  };
}

module.exports = { sendMessage, recordInbound, recordStatus, getStatus };
