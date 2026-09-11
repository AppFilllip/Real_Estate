const express = require("express");
const cors = require("cors");
const { leadRoutes } = require("./modules/leads/leads.routes");
const { moduleRoutes } = require("./modules");
const { authRoutes } = require("./modules/auth/auth.routes");
const { errorHandler } = require("./middlewares/error-handler");
const { requestLogger } = require("./middlewares/request-logger");
const { serializeBigInt } = require("./middlewares/serialize-bigint");
const { requireAuth } = require("./middlewares/auth");
const { resolveCompanyScope } = require("./middlewares/company-scope");
const { authorizeRequest } = require("./middlewares/permissions");

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
  app.use("/api/leads", requireAuth, resolveCompanyScope, authorizeRequest, leadRoutes);
  app.use("/api", requireAuth, resolveCompanyScope, authorizeRequest, moduleRoutes);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
