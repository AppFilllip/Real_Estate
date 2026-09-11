const { verifyAccessToken } = require("../utils/tokens");
const { httpError } = require("../utils/http-error");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function requireAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      throw httpError(401, "Not authenticated");
    }

    req.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error.statusCode ? error : httpError(401, "Invalid or expired token"));
  }
}

module.exports = { requireAuth };
