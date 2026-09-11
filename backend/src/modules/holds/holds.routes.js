const { Router } = require("express");
const { HoldsController } = require("./holds.controller");

const holdRoutes = Router();
const controller = new HoldsController();

holdRoutes.get("/", controller.list);
holdRoutes.post("/", controller.create);
holdRoutes.patch("/:id/release", controller.release);

module.exports = { holdRoutes };
