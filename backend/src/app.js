const express = require("express");
const cors = require("cors");
const { leadRoutes } = require("./modules/leads/leads.routes");
const { moduleRoutes } = require("./modules");
const { authRoutes } = require("./modules/auth/auth.routes");
const { uploadRoutes, UPLOAD_DIR } = require("./modules/uploads/uploads.routes");
const { errorHandler } = require("./middlewares/error-handler");
const { requestLogger } = require("./middlewares/request-logger");
const { serializeBigInt } = require("./middlewares/serialize-bigint");
const { requireAuth } = require("./middlewares/auth");
const { resolveCompanyScope } = require("./middlewares/company-scope");
const { authorizeRequest } = require("./middlewares/permissions");
const { whatsappWebhookRoutes } = require("./modules/whatsapp/whatsapp.webhook.routes");
const { callWebhookRoutes } = require("./modules/calls/calls.webhook.routes");

function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(serializeBigInt);
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "estateos-backend" });
  });

  app.use("/api/auth", authRoutes);
  // Public — called by the WhatsApp gateway itself, not a logged-in user.
  app.use("/api/whatsapp/webhook", whatsappWebhookRoutes);
  // Public — called by Twilio itself while a click-to-call is in progress.
  app.use("/api/calls/twiml", callWebhookRoutes);
  // Uploaded files served directly from disk; the permission boundary lives on
  // whichever record (project, booking, ...) the returned URL gets attached to.
  app.use("/uploads", express.static(UPLOAD_DIR));
  app.use("/api/uploads", requireAuth, resolveCompanyScope, uploadRoutes);
  app.use("/api/leads", requireAuth, resolveCompanyScope, authorizeRequest, leadRoutes);
  app.use("/api", requireAuth, resolveCompanyScope, authorizeRequest, moduleRoutes);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
