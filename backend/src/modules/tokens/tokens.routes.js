const { Router } = require("express");
const { TokensController } = require("./tokens.controller");

const tokenRoutes = Router();
const controller = new TokensController();

tokenRoutes.get("/", controller.list);
tokenRoutes.post("/", controller.create);
tokenRoutes.patch("/:id/convert", controller.convert);
tokenRoutes.patch("/:id/refund", controller.refund);

module.exports = { tokenRoutes };
