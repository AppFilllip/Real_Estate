const { Router } = require("express");
const { LeadsController } = require("./leads.controller");

const leadRoutes = Router();
const controller = new LeadsController();

leadRoutes.get("/", controller.list);
leadRoutes.get("/counts", controller.counts);
leadRoutes.get("/duplicates", controller.duplicates);
leadRoutes.get("/:id", controller.getById);
leadRoutes.post("/", controller.create);
leadRoutes.patch("/:id", controller.update);
leadRoutes.patch("/:id/stage", controller.changeStage);
leadRoutes.patch("/:id/assign", controller.assignOwner);
leadRoutes.get("/:id/timeline", controller.timeline);
leadRoutes.get("/:id/notes", controller.listNotes);
leadRoutes.post("/:id/notes", controller.addNote);
leadRoutes.get("/:id/tasks", controller.listTasks);
leadRoutes.post("/:id/tasks", controller.addTask);
leadRoutes.put("/:id/requirements", controller.upsertRequirement);
leadRoutes.post("/:id/shortlist", controller.addShortlist);
leadRoutes.delete("/:id/shortlist/:unitId", controller.removeShortlist);
leadRoutes.post("/:id/tag-broker", controller.tagBroker);

module.exports = { leadRoutes };
