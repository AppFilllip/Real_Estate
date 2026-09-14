const { prisma } = require("../../db/prisma");
const { httpError } = require("../../utils/http-error");
const { env } = require("../../config/env");
const provider = require("./calls.provider");

function webhookUrl(path, callId, extra = "") {
  const base = env.twilioWebhookBaseUrl.replace(/\/$/, "");
  const token = env.twilioWebhookToken ? `&token=${encodeURIComponent(env.twilioWebhookToken)}` : "";
  return `${base}${path}?callId=${callId}${token}${extra}`;
}

async function resolveContact({ leadId, customerId }, companyId) {
  if (leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, companyId } });
    if (!lead) throw httpError(404, "Lead not found");
    return { phone: lead.phone, leadId: lead.id, customerId: undefined };
  }
  if (customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId } });
    if (!customer) throw httpError(404, "Customer not found");
    return { phone: customer.phone, leadId: undefined, customerId: customer.id };
  }
  throw httpError(400, "leadId or customerId is required");
}

/**
 * Authenticated: POST /api/calls/dial — click-to-call.
 * Twilio rings the agent's own phone first; once they answer, the TwiML
 * webhook below bridges the call to the lead/customer's number. Nothing
 * plays in the browser — this is a real two real-phone-number bridge, not
 * browser/WebRTC calling.
 */
async function dial(req, res, next) {
  try {
    if (!provider.isConfigured()) {
      return res.status(422).json({ error: { message: "Calling isn't connected yet." } });
    }

    const { leadId, customerId } = req.body;
    const contact = await resolveContact({ leadId, customerId }, req.companyId);
    if (!contact.phone) throw httpError(422, "No phone number on record for this contact");

    const agent = await prisma.user.findFirst({ where: { id: req.auth.sub, companyId: req.companyId } });
    if (!agent?.phone) throw httpError(422, "Add a phone number to your profile in Settings before placing calls");

    const call = await prisma.call.create({
      data: {
        companyId: req.companyId,
        leadId: contact.leadId,
        customerId: contact.customerId,
        direction: "OUTBOUND",
        status: "INITIATED",
        fromNumber: env.twilioFromNumber,
        toNumber: contact.phone,
        agentId: agent.id,
        startedAt: new Date(),
      },
    });

    const result = await provider.placeCall({
      to: agent.phone,
      twimlUrl: webhookUrl("/api/calls/twiml/connect", call.id),
      statusCallbackUrl: webhookUrl("/api/calls/twiml/status", call.id, "&leg=agent"),
    });

    if (!result.started) {
      await prisma.call.update({ where: { id: call.id }, data: { status: "FAILED", endedAt: new Date() } });
      return res.status(502).json({ error: { message: result.error || "Could not start the call" } });
    }

    await prisma.call.update({ where: { id: call.id }, data: { providerCallSid: result.providerCallSid } });

    res.status(201).json({
      data: { callId: call.id },
      message: `Calling you at ${agent.phone} now — answer to connect to ${contact.phone}`,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { dial };
