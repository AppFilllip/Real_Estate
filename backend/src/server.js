require("dotenv").config();

const { createApp } = require("./app");
const { logger } = require("./utils/logger");

const port = process.env.PORT || 4000;
const app = createApp();

app.listen(port, () => {
  logger.info(`EstateOS backend listening on port ${port}`);
});
