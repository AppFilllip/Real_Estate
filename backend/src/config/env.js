require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  cookieSecure: process.env.COOKIE_SECURE === "true",
  logLevel: process.env.LOG_LEVEL || "info",
};

module.exports = { env };
