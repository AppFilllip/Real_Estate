const service = require("./whatsapp.service");
const { httpError } = require("../../utils/http-error");
const { env } = require("../../config/env");

/** Authenticated: POST /api/whatsapp/send */
async function send(req, res, next) {
  try {
    const { leadId, customerId, phone, text } = req.body;
    const result = await service.sendMessage(req.companyId, {
      leadId,
      customerId,
      phone,
      text,
      actorId: req.auth && req.auth.sub,
    });
    // Always 201: the Message row is created either way (status SENT or
    // FAILED) so it shows up in the conversation thread; `sent` in the body
    // is what callers should branch on, not the HTTP status.
    res.status(201).json({ data: result.message, sent: result.sent, error: result.error });
  } catch (error) {
    next(error);
  }
}

/** Authenticated: GET /api/whatsapp/status */
async function status(_req, res, next) {
  try {
    res.json({ data: service.getStatus() });
  } catch (error) {
    next(error);
  }
}

/**
 * Public webhook: POST /api/whatsapp/webhook?companyId=...
 *
 * ADAPT: this route is NOT behind requireAuth (mounted directly in app.js,
 * ahead of the generic authenticated /api chain) since it's called by the
 * gateway itself, not a logged-in user. `companyId` identifies which
 * workspace's WhatsApp session this webhook belongs to — pass it as a query
 * param on the webhook URL you register with the gateway. If
 * WHATSAPP_WEBHOOK_SECRET is set, the same value must be sent back as
 * `?secret=` (verify against your gateway's real signing/verification
 * mechanism if it offers one instead).
 */
async function webhook(req, res, next) {
  try {
    if (env.whatsappWebhookSecret && req.query.secret !== env.whatsappWebhookSecret) {
      throw httpError(401, "Invalid webhook secret");
    }

    const companyId = req.query.companyId;
    if (!companyId) throw httpError(400, "companyId query param is required");

    const payload = req.body || {};
    if (payload.status) {
      await service.recordStatus(companyId, payload);
    } else {
      await service.recordInbound(companyId, payload);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
}

module.exports = { send, status, webhook };
