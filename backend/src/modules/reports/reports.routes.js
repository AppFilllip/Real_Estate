const { Router } = require("express");
const { ReportsController } = require("./reports.controller");

const reportsRoutes = Router();
const controller = new ReportsController();

reportsRoutes.get("/dashboard", controller.dashboard);
reportsRoutes.get("/leads", controller.leads);
reportsRoutes.get("/inventory", controller.inventory);
reportsRoutes.get("/sales", controller.sales);
reportsRoutes.get("/collections", controller.collections);
reportsRoutes.get("/brokers", controller.brokers);
reportsRoutes.get("/exec-performance", controller.execPerformance);
reportsRoutes.get("/stage-conversion", controller.stageConversion);

module.exports = { reportsRoutes };
