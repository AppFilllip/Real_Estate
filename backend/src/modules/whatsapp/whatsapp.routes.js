const { Router } = require("express");
const controller = require("./whatsapp.controller");

// Mounted under moduleRoutes in modules/index.js, so it already sits behind
// requireAuth + resolveCompanyScope + authorizeRequest from app.js.
const whatsappRoutes = Router();

whatsappRoutes.post("/send", controller.send);
whatsappRoutes.get("/status", controller.status);

module.exports = { whatsappRoutes };
