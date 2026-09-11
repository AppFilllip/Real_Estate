const { CostSheetsService } = require("./cost-sheets.service");

class CostSheetsController {
  constructor(service = new CostSheetsService()) {
    this.service = service;
  }
  list = async (req, res, next) => { try { res.json({ data: await this.service.list(req.query) }); } catch (e) { next(e); } };
  getById = async (req, res, next) => { try { const row = await this.service.getById(req.query.companyId, req.params.id); if (!row) return res.status(404).json({ error: { message: "Cost sheet not found" } }); return res.json({ data: row }); } catch (e) { return next(e); } };
  create = async (req, res, next) => { try { res.status(201).json({ data: await this.service.create(req.body, req.auth) }); } catch (e) { next(e); } };
  addNegotiation = async (req, res, next) => { try { res.status(201).json({ data: await this.service.addNegotiation(req.query.companyId, req.params.id, req.body, req.auth) }); } catch (e) { next(e); } };
}

module.exports = { CostSheetsController };
