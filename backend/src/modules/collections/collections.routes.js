const { Router } = require("express");
const { CollectionsController } = require("./collections.controller");

const collectionsRoutes = Router();
const controller = new CollectionsController();

collectionsRoutes.get("/summary", controller.summary);
collectionsRoutes.get("/outstanding", controller.outstanding);
collectionsRoutes.get("/ageing", controller.ageing);
collectionsRoutes.get("/due-soon", controller.dueSoon);
collectionsRoutes.get("/cheques", controller.cheques);

module.exports = { collectionsRoutes };
