const { prisma } = require("../db/prisma");
const { withNotDeleted } = require("./not-deleted");

// A role's permissionsJson carries a "scope" of "own" | "team" | "all" (see
// prisma/seed-demo.js ROLES). This resolves that into the concrete set of
// user ids a request is allowed to see data for — null means no restriction
// (scope "all", or a role with no scope set, or SUPER_ADMIN).
async function resolveOwnerScope(auth) {
  if (!auth) return null;
  if (auth.roleCode === "SUPER_ADMIN") return null;

  const scope = auth.permissions && auth.permissions.scope;
  if (scope === "own") return [auth.sub];

  if (scope === "team") {
    if (!auth.teamId) return [auth.sub];
    const teammates = await prisma.user.findMany({
      where: withNotDeleted({ companyId: auth.companyId, teamId: auth.teamId }),
      select: { id: true },
    });
    return teammates.map((user) => user.id);
  }

  return null;
}

module.exports = { resolveOwnerScope };
