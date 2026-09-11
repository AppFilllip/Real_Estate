const { Router } = require("express");
const { ReceiptsController } = require("./receipts.controller");

const receiptRoutes = Router();
const controller = new ReceiptsController();

receiptRoutes.get("/", controller.list);
receiptRoutes.get("/:id", controller.getById);
receiptRoutes.post("/", controller.create);
receiptRoutes.patch("/:id", controller.update);
receiptRoutes.delete("/:id", controller.remove);
receiptRoutes.post("/:id/allocations", controller.allocate);

module.exports = { receiptRoutes };
