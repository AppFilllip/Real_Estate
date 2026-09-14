const { Router } = require("express");
const controller = require("./whatsapp.controller");

// Public — no requireAuth. Mounted directly in app.js ahead of the generic
// authenticated /api chain, the same way leadRoutes gets a dedicated mount.
const whatsappWebhookRoutes = Router();

whatsappWebhookRoutes.post("/", controller.webhook);

module.exports = { whatsappWebhookRoutes };
