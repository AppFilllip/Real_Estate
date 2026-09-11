const { httpError } = require("../utils/http-error");

function requireRole(...roleCodes) {
  return (req, _res, next) => {
    const roleCode = req.auth && req.auth.roleCode;

    if (!roleCode || !roleCodes.includes(roleCode)) {
      return next(httpError(403, "Permission denied"));
    }

    return next();
  };
}

function requirePermission(resource, action) {
  return (req, _res, next) => {
    if (hasPermission(req.auth, resource, action)) return next();
    return next(httpError(403, "Permission denied"));
  };
}

function authorizeRequest(req, _res, next) {
  const resource = resourceFromPath(req.originalUrl || req.path);
  const action = actionFromMethod(req.method);

  if (!resource || !action || hasPermission(req.auth, resource, action)) {
    return next();
  }

  return next(httpError(403, "Permission denied"));
}

function hasPermission(auth, resource, action) {
  if (!auth) return false;
  if (auth.roleCode === "SUPER_ADMIN") return true;

  const permissions = auth.permissions || {};
  const grants = permissions[resource] || permissions["*"] || [];
  return Array.isArray(grants) && (grants.includes(action) || grants.includes("*"));
}

function resourceFromPath(path) {
  const [resource] = path.split("?")[0].replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return resource;
}

function actionFromMethod(method) {
  return {
    GET: "R",
    POST: "C",
    PUT: "U",
    PATCH: "U",
    DELETE: "D",
  }[method];
}

module.exports = { authorizeRequest, hasPermission, requirePermission, requireRole };
