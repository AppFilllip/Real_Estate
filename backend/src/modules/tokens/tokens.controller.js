const { TokensService } = require("./tokens.service");

class TokensController {
  constructor(service = new TokensService()) { this.service = service; }
  list = async (req, res, next) => { try { res.json({ data: await this.service.list(req.query) }); } catch (e) { next(e); } };
  create = async (req, res, next) => { try { res.status(201).json({ data: await this.service.create(req.body, req.auth) }); } catch (e) { next(e); } };
  convert = async (req, res, next) => { try { res.json({ data: await this.service.convert(req.query.companyId, req.params.id, req.auth) }); } catch (e) { next(e); } };
  refund = async (req, res, next) => { try { res.json({ data: await this.service.refund(req.query.companyId, req.params.id, req.body, req.auth) }); } catch (e) { next(e); } };
}

module.exports = { TokensController };
