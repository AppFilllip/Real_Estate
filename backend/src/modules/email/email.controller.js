const service = require("./email.service");

/** Authenticated: POST /api/email/send */
async function send(req, res, next) {
  try {
    const { leadId, customerId, email, subject, body } = req.body;
    const result = await service.sendMessage(req.companyId, {
      leadId,
      customerId,
      email,
      subject,
      body,
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

/** Authenticated: GET /api/email/status */
async function status(_req, res, next) {
  try {
    res.json({ data: service.getStatus() });
  } catch (error) {
    next(error);
  }
}

module.exports = { send, status };
