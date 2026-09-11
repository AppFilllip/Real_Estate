const { InventoryService } = require("./inventory.service");

class InventoryController {
  constructor(service = new InventoryService()) {
    this.service = service;
  }

  summary = async (req, res, next) => {
    try {
      res.json({ data: await this.service.summary(req.query) });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { InventoryController };
