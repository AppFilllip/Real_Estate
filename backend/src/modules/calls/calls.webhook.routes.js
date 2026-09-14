const { Router } = require("express");
const express = require("express");
const controller = require("./calls.webhook.controller");

// Public — no requireAuth. Mounted directly in app.js ahead of the generic
// authenticated /api chain, the same way the WhatsApp webhook is. Twilio
// always posts webhooks as application/x-www-form-urlencoded, not JSON.
const callWebhookRoutes = Router();
callWebhookRoutes.use(express.urlencoded({ extended: false }));

callWebhookRoutes.post("/status", controller.twimlStatus);

module.exports = { callWebhookRoutes };
