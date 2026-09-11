const { Router } = require("express");
const { InventoryController } = require("./inventory.controller");

const inventoryRoutes = Router();
const controller = new InventoryController();

inventoryRoutes.get("/summary", controller.summary);

module.exports = { inventoryRoutes };
