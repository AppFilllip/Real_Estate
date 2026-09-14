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

  // WhatsApp — hosted "linked session" gateway (waba.api.lumotis.com style BSP).
  whatsappApiUrl: process.env.WHATSAPP_API_URL || "https://waba.api.lumotis.com",
  whatsappSessionId: process.env.WHATSAPP_SESSION_ID || "",
  whatsappToken: process.env.WHATSAPP_TOKEN || "",
  whatsappAlertPhone: process.env.WHATSAPP_ALERT_PHONE || "",
  whatsappDefaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "91",
  whatsappWebhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || "",

  // Email — ZeptoMail transactional send API.
  zeptoApiUrl: process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email",
  // Paste the full "Send Mail Token" value from ZeptoMail as-is — it already
  // comes prefixed with "Zoho-enczapikey ", which is what the Authorization
  // header expects verbatim.
  zeptoToken: process.env.ZEPTOMAIL_TOKEN || "",
  zeptoFromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || "",
  zeptoFromName: process.env.ZEPTOMAIL_FROM_NAME || "EstateOS",

  // Calling — Twilio click-to-call: rings the agent's own phone first, then
  // bridges to the lead/customer once the agent answers.
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  // The backend's own public HTTPS URL (e.g. your Render backend URL) — Twilio
  // fetches call instructions and posts status updates back to this.
  twilioWebhookBaseUrl: process.env.TWILIO_WEBHOOK_BASE_URL || "",
  twilioWebhookToken: process.env.TWILIO_WEBHOOK_TOKEN || "",
};

module.exports = { env };
