const { ReceiptsService } = require("./receipts.service");

class ReceiptsController {
  constructor(service = new ReceiptsService()) {
    this.service = service;
  }
  list = async (req, res, next) => { try { res.json({ data: await this.service.list(req.query) }); } catch (e) { next(e); } };
  getById = async (req, res, next) => {
    try {
      const row = await this.service.getById(req.query.companyId, req.params.id);
      if (!row) return res.status(404).json({ error: { message: "Receipt not found" } });
      return res.json({ data: row });
    } catch (e) { return next(e); }
  };
  create = async (req, res, next) => { try { res.status(201).json({ data: await this.service.create(req.body, req.auth) }); } catch (e) { next(e); } };
  update = async (req, res, next) => { try { res.json({ data: await this.service.update(req.query.companyId, req.params.id, req.body) }); } catch (e) { next(e); } };
  remove = async (req, res, next) => { try { res.json({ data: await this.service.remove(req.query.companyId, req.params.id) }); } catch (e) { next(e); } };
  allocate = async (req, res, next) => { try { res.status(201).json({ data: await this.service.allocate(req.query.companyId, req.params.id, req.body) }); } catch (e) { next(e); } };
}

module.exports = { ReceiptsController };
