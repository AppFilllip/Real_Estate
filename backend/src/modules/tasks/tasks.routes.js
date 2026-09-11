const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");

const taskRoutes = createCrudRoutes({
  modelName: "task",
  resourceName: "Task",
  filterFields: ["status", "assigneeId", "leadId", "bookingId"],
  searchFields: ["title", "note", "dispositionNote"],
  requiredFields: ["companyId", "type", "dueAt", "assigneeId"],
  allowedFields: [
    "companyId",
    "leadId",
    "bookingId",
    "type",
    "status",
    "title",
    "note",
    "dueAt",
    "reminderMinutesBefore",
    "snoozedUntil",
    "completedAt",
    "disposition",
    "dispositionNote",
    "assigneeId",
    "createdById",
  ],
});

taskRoutes.patch("/:id/done", async (req, res, next) => {
  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        status: "DONE",
        completedAt: new Date(),
        disposition: req.body.disposition,
        dispositionNote: req.body.dispositionNote,
      },
    });

    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

module.exports = { taskRoutes };
