const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { env } = require("../config/env");

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      companyId: user.companyId,
      teamId: user.teamId,
      roleId: user.roleId,
      roleCode: user.role && user.role.code,
      permissions: user.role && user.role.permissionsJson,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate() {
  return new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
}

module.exports = { signAccessToken, verifyAccessToken, createRefreshToken, hashRefreshToken, refreshExpiryDate };
