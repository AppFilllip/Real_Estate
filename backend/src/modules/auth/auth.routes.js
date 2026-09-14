const { Router } = require("express");
const { AuthController } = require("./auth.controller");
const { requireAuth } = require("../../middlewares/auth");

const authRoutes = Router();
const controller = new AuthController();

authRoutes.post("/login", controller.login);
authRoutes.post("/otp/request", controller.requestOtp);
authRoutes.post("/otp/verify", controller.verifyOtp);
authRoutes.post("/refresh", controller.refresh);
authRoutes.post("/logout", controller.logout);
authRoutes.get("/me", requireAuth, controller.me);

module.exports = { authRoutes };
