const { Router } = require("express");
const controller = require("./email.controller");

// Mounted under moduleRoutes in modules/index.js, so it already sits behind
// requireAuth + resolveCompanyScope + authorizeRequest from app.js.
const emailRoutes = Router();

emailRoutes.post("/send", controller.send);
emailRoutes.get("/status", controller.status);

module.exports = { emailRoutes };
