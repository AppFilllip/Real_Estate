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

function escapeXml(value) {
  return String(value || "").replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
}

function statusUrl(callId) {
  const base = env.twilioWebhookBaseUrl.replace(/\/$/, "");
  const token = env.twilioWebhookToken ? `&token=${encodeURIComponent(env.twilioWebhookToken)}` : "";
  return `${base}/api/calls/twiml/status?callId=${callId}${token}&leg=customer`;
}

/**
 * Public webhook: Twilio fetches this once the agent answers their phone —
 * the agent hears "Connecting your call" and Twilio dials the lead/customer.
 */
async function twimlConnect(req, res, next) {
  try {
    if (!verifyToken(req)) return res.status(401).send("Invalid token");

    const call = await prisma.call.findUnique({ where: { id: String(req.query.callId) } }).catch(() => null);
    if (!call) return res.status(404).send("Call not found");

    await prisma.call.update({ where: { id: call.id }, data: { status: "RINGING", answeredAt: new Date() } });

    res.type("text/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response>` +
        `<Say>Connecting your call.</Say>` +
        `<Dial callerId="${escapeXml(call.fromNumber)}" action="${escapeXml(statusUrl(call.id))}">` +
        `<Number>${escapeXml(call.toNumber)}</Number>` +
        `</Dial>` +
        `</Response>`
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Public webhook: Twilio posts progress here twice per call —
 * once for the agent leg (StatusCallback on the outer call) and once for the
 * customer leg (the `action` on <Dial>, fired when that leg ends).
 */
async function twimlStatus(req, res, next) {
  try {
    if (!verifyToken(req)) return res.status(401).send("Invalid token");

    const call = await prisma.call.findUnique({ where: { id: String(req.query.callId) } }).catch(() => null);
    if (!call) return res.type("text/xml").send("<Response></Response>");

    const body = req.body || {};

    if (req.query.leg === "customer") {
      const dialStatus = body.DialCallStatus;
      const duration = Number(body.DialCallDuration || 0);
      await prisma.call.update({
        where: { id: call.id },
        data: {
          status: DIAL_STATUS_MAP[dialStatus] || "COMPLETED",
          talkSeconds: duration || undefined,
          endedAt: new Date(),
        },
      });
    } else {
      // Agent leg — only matters if the agent never picked up at all; the
      // customer leg (above) is authoritative once the call actually connects.
      const callStatus = body.CallStatus;
      if (["no-answer", "busy", "failed", "canceled"].includes(callStatus) && call.status === "INITIATED") {
        await prisma.call.update({ where: { id: call.id }, data: { status: "MISSED", endedAt: new Date() } });
      }
    }

    res.type("text/xml").send("<Response></Response>");
  } catch (error) {
    next(error);
  }
}

module.exports = { twimlConnect, twimlStatus };
