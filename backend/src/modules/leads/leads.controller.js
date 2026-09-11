const { LeadsService } = require("./leads.service");

class LeadsController {
  constructor(service = new LeadsService()) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const leads = await this.service.listLeads(req.query, req.auth);
      res.json({ data: leads });
    } catch (error) {
      next(error);
    }
  };

  counts = async (req, res, next) => {
    try {
      const counts = await this.service.getLeadCounts(req.query.companyId, req.auth && req.auth.sub, req.auth);
      res.json({ data: counts });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const lead = await this.service.getLead(req.query.companyId, req.params.id);

      if (!lead) {
        return res.status(404).json({ error: { message: "Lead not found" } });
      }

      return res.json({ data: lead });
    } catch (error) {
      return next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const lead = await this.service.createLead(req.body);
      res.status(201).json({ data: lead });
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const lead = await this.service.updateLead(req.query.companyId, req.params.id, req.body);
      res.json({ data: lead });
    } catch (error) {
      next(error);
    }
  };

  duplicates = async (req, res, next) => {
    try {
      const leads = await this.service.findDuplicates(req.query);
      res.json({ data: leads });
    } catch (error) {
      next(error);
    }
  };

  changeStage = async (req, res, next) => {
    try {
      const lead = await this.service.changeStage(req.query.companyId, req.params.id, req.body, req.auth);
      res.json({ data: lead });
    } catch (error) {
      next(error);
    }
  };

  assignOwner = async (req, res, next) => {
    try {
      const lead = await this.service.assignOwner(req.query.companyId, req.params.id, req.body, req.auth);
      res.json({ data: lead });
    } catch (error) {
      next(error);
    }
  };

  timeline = async (req, res, next) => {
    try {
      const timeline = await this.service.getTimeline(req.query.companyId, req.params.id);
      res.json({ data: timeline });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req, res, next) => {
    try {
      const note = await this.service.addNote(req.query.companyId, req.params.id, req.body, req.auth);
      res.status(201).json({ data: note });
    } catch (error) {
      next(error);
    }
  };

  listNotes = async (req, res, next) => {
    try {
      const notes = await this.service.listNotes(req.query.companyId, req.params.id);
      res.json({ data: notes });
    } catch (error) {
      next(error);
    }
  };

  addTask = async (req, res, next) => {
    try {
      const task = await this.service.addTask(req.query.companyId, req.params.id, req.body, req.auth);
      res.status(201).json({ data: task });
    } catch (error) {
      next(error);
    }
  };

  listTasks = async (req, res, next) => {
    try {
      const tasks = await this.service.listTasks(req.query.companyId, req.params.id);
      res.json({ data: tasks });
    } catch (error) {
      next(error);
    }
  };

  upsertRequirement = async (req, res, next) => {
    try {
      const requirement = await this.service.upsertRequirement(req.query.companyId, req.params.id, req.body, req.auth);
      res.json({ data: requirement });
    } catch (error) {
      next(error);
    }
  };

  addShortlist = async (req, res, next) => {
    try {
      const shortlist = await this.service.addShortlist(req.query.companyId, req.params.id, req.body, req.auth);
      res.status(201).json({ data: shortlist });
    } catch (error) {
      next(error);
    }
  };

  removeShortlist = async (req, res, next) => {
    try {
      const removed = await this.service.removeShortlist(req.query.companyId, req.params.id, req.params.unitId, req.auth);
      res.json({ data: removed });
    } catch (error) {
      next(error);
    }
  };

  tagBroker = async (req, res, next) => {
    try {
      const lead = await this.service.tagBroker(req.query.companyId, req.params.id, req.body, req.auth);
      res.json({ data: lead });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { LeadsController };
