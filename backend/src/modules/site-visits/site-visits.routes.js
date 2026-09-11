const { Router } = require("express");
const { SiteVisitsController } = require("./site-visits.controller");

const siteVisitRoutes = Router();
const controller = new SiteVisitsController();

siteVisitRoutes.get("/", controller.list);
siteVisitRoutes.get("/count", controller.count);
siteVisitRoutes.get("/:id", controller.getById);
siteVisitRoutes.post("/", controller.schedule);
siteVisitRoutes.patch("/:id/confirm", controller.confirm);
siteVisitRoutes.patch("/:id/reschedule", controller.reschedule);
siteVisitRoutes.patch("/:id/cancel", controller.cancel);
siteVisitRoutes.patch("/:id/no-show", controller.markNoShow);
siteVisitRoutes.patch("/:id/check-in", controller.checkIn);
siteVisitRoutes.post("/:id/outcome", controller.outcome);

module.exports = { siteVisitRoutes };
