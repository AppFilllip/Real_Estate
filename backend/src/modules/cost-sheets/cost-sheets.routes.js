const { Router } = require("express");
const { CostSheetsController } = require("./cost-sheets.controller");

const costSheetRoutes = Router();
const controller = new CostSheetsController();

costSheetRoutes.get("/", controller.list);
costSheetRoutes.get("/:id", controller.getById);
costSheetRoutes.post("/", controller.create);
costSheetRoutes.post("/:id/negotiations", controller.addNegotiation);

module.exports = { costSheetRoutes };
