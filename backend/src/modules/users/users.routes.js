const { createCrudRoutes } = require("../../shared/create-crud-routes");
const { prisma } = require("../../db/prisma");
const { hashPassword } = require("../../utils/password");
const { httpError } = require("../../utils/http-error");
const { withNotDeleted } = require("../../utils/not-deleted");
const { sendInviteEmail } = require("../email/system-emails");

const userRoutes = createCrudRoutes({
  modelName: "user",
  resourceName: "User",
  filterFields: ["status", "roleId", "teamId"],
  searchFields: ["name", "email", "phone"],
  requiredFields: ["companyId", "name", "email", "phone", "roleId"],
  allowedFields: [
    "companyId",
    "name",
    "email",
    "phone",
    "avatarUrl",
    "status",
    "roleId",
    "teamId",
    "managerId",
    "dailyLeadCap",
    "shiftStart",
    "shiftEnd",
    "targetsJson",
    "preferencesJson",
  ],
  afterCreate: async (user) => {
    const company = await prisma.company.findUnique({ where: { id: user.companyId } });
    await sendInviteEmail({ to: user.email, name: user.name, companyName: company?.name });
  },
});

// Not exposed through allowedFields above — passwordHash must only ever be
// written here, after hashing, never accepted as raw input from a client.
userRoutes.patch("/:id/set-password", async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      throw httpError(400, "password must be at least 8 characters");
    }

    const existing = await prisma.user.findFirst({
      where: withNotDeleted({ id: req.params.id, companyId: req.query.companyId }),
    });
    if (!existing) return res.status(404).json({ error: { message: "User not found" } });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash, status: "ACTIVE" },
    });
    res.json({ data: { id: user.id, status: user.status } });
  } catch (error) {
    next(error);
  }
});

module.exports = { userRoutes };
