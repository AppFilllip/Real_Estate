const { randomUUID } = require("crypto");
const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const provider = require("./email.provider");
const { plainTextToEmailHtml } = require("./format-email-html");

async function resolveRecipient({ email, leadId, customerId }, companyId) {
  if (email) return email;

  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) throw httpError(404, "Lead not found");
    return lead.email;
  }

  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
    if (!customer) throw httpError(404, "Customer not found");
    return customer.email;
  }

  throw httpError(400, "email, leadId, or customerId is required");
}

async function findOrCreateConversation(companyId, { leadId, customerId, contactValue, assigneeId }) {
  const existing = await prisma.conversation.findFirst({
    where: { companyId, channel: "EMAIL", contactValue },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      companyId,
      channel: "EMAIL",
      contactValue,
      leadId: leadId || undefined,
      customerId: customerId || undefined,
      assigneeId: assigneeId || undefined,
      status: "OPEN",
    },
  });
}

/**
 * Send an outbound email, recording it as a Message on the matching
 * Conversation regardless of whether the provider send actually succeeds —
 * a failed send still shows up in the thread with status FAILED.
 */
async function sendMessage(companyId, { leadId, customerId, email, subject, body, actorId }) {
  if (!subject || !subject.trim()) throw httpError(400, "subject is required");
  if (!body || !body.trim()) throw httpError(400, "body is required");

  const resolvedEmail = await resolveRecipient({ email, leadId, customerId }, companyId);
  if (!resolvedEmail) throw httpError(422, "No email address on record for this contact");

  const conversation = await findOrCreateConversation(companyId, { leadId, customerId, contactValue: resolvedEmail });

  const result = await provider.sendEmail({ to: resolvedEmail, subject, body: plainTextToEmailHtml(body) });

  const message = await prisma.message.create({
    data: {
      companyId,
      conversationId: conversation.id,
      direction: "OUTBOUND",
      status: result.sent ? "SENT" : "FAILED",
      body: `Subject: ${subject}\n\n${body}`,
      senderType: "USER",
      senderId: actorId || undefined,
      sentAt: result.sent ? new Date() : undefined,
      failureReason: result.sent ? undefined : result.error,
      // (companyId, providerMessageId) is a unique index — a failed/unsent
      // send still needs its own synthetic idempotency key.
      providerMessageId: result.providerMessageId || `local-${randomUUID()}`,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  return { message, sent: result.sent, error: result.error };
}

function getStatus() {
  return { configured: provider.isConfigured() };
}

module.exports = { sendMessage, getStatus };
