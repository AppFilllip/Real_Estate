const { httpError } = require("../utils/http-error");

function resolveCompanyScope(req, _res, next) {
  // Express 5 leaves req.body undefined on requests without a JSON body (GET).
  if (!req.body || typeof req.body !== "object") req.body = {};
  const requestedCompanyId = req.query.companyId || req.body.companyId;
  const tokenCompanyId = req.auth && req.auth.companyId;

  if (!tokenCompanyId) {
    return next(httpError(401, "Token is missing company scope"));
  }

  // Super Admin can work inside any workspace by sending X-Workspace-Id —
  // every other role is always confined to their own token's company,
  // regardless of what this header says.
  const isSuperAdmin = req.auth && req.auth.roleCode === "SUPER_ADMIN";
  const workspaceOverride = isSuperAdmin ? req.get("x-workspace-id") : null;
  const effectiveCompanyId = workspaceOverride || tokenCompanyId;

  if (requestedCompanyId && requestedCompanyId !== effectiveCompanyId) {
    return next(httpError(403, "Cannot access another company"));
  }

  req.companyId = effectiveCompanyId;
  // Express 5 exposes req.query as a getter that re-parses the URL on every
  // access, so a plain assignment is lost. Pin a merged copy on the request.
  Object.defineProperty(req, "query", {
    value: { ...req.query, companyId: effectiveCompanyId },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  req.body.companyId = effectiveCompanyId;

  return next();
}

module.exports = { resolveCompanyScope };
