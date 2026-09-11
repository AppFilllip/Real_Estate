const { Router } = require("express");
const { UnitsController } = require("./units.controller");
const { UnitsSummaryController } = require("./units.summary.controller");

const unitRoutes = Router();
const controller = new UnitsController();
const summaryController = new UnitsSummaryController();

unitRoutes.get("/", controller.list);
unitRoutes.get("/summary", summaryController.summary);
unitRoutes.get("/:id", controller.getById);
unitRoutes.post("/", controller.create);
unitRoutes.patch("/:id", controller.update);
unitRoutes.patch("/:id/status", controller.changeStatus);
unitRoutes.delete("/:id", controller.remove);

module.exports = { unitRoutes };
