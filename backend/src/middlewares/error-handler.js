const { logger } = require("../utils/logger");

function errorHandler(error, _req, res, _next) {
  logger.error("request_failed", { message: error.message, stack: error.stack });

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? "Internal server error" : error.message,
    },
  });
}

module.exports = { errorHandler };
