const { prisma } = require("../../db/prisma");
const { env } = require("../../config/env");

const DIAL_STATUS_MAP = {
  completed: "COMPLETED",
  "no-answer": "MISSED",
  busy: "MISSED",
  failed: "FAILED",
  canceled: "FAILED",
};

function verifyToken(req) {
  if (!env.twilioWebhookToken) return true;
  return req.query.token === env.twilioWebhookToken;
}

/**
 * Public webhook: optional. Only reached when TWILIO_WEBHOOK_BASE_URL is
 * configured, since that's the only case the dial controller passes this URL
 * to Twilio at all. Twilio posts here twice per call — once as the plain
 * StatusCallback for the outer call (the agent's own leg: has `CallStatus`),
 * and once as the `<Dial action>` callback when the customer leg ends (has
 * `DialCallStatus` instead) — the two are told apart by which field is present.
 */
async function twimlStatus(req, res, next) {
  try {
    if (!verifyToken(req)) return res.status(401).send("Invalid token");

    const call = await prisma.call.findUnique({ where: { id: String(req.query.callId) } }).catch(() => null);
    if (!call) return res.type("text/xml").send("<Response></Response>");

    const body = req.body || {};

    if (body.DialCallStatus) {
      const duration = Number(body.DialCallDuration || 0);
      await prisma.call.update({
        where: { id: call.id },
        data: {
          status: DIAL_STATUS_MAP[body.DialCallStatus] || "COMPLETED",
          talkSeconds: duration || undefined,
          endedAt: new Date(),
        },
      });
    } else if (body.CallStatus) {
      // Agent leg — only matters if the agent never picked up at all; the
      // Dial-action outcome (above) is authoritative once the call connects.
      if (["no-answer", "busy", "failed", "canceled"].includes(body.CallStatus) && call.status === "INITIATED") {
        await prisma.call.update({ where: { id: call.id }, data: { status: "MISSED", endedAt: new Date() } });
      } else if (body.CallStatus === "in-progress" && call.status === "INITIATED") {
        await prisma.call.update({ where: { id: call.id }, data: { status: "RINGING", answeredAt: new Date() } });
      }
    }

    res.type("text/xml").send("<Response></Response>");
  } catch (error) {
    next(error);
  }
}

module.exports = { twimlStatus };
