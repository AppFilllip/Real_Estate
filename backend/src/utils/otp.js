const crypto = require("crypto");

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between requests

function generateOtpCode() {
  const max = 10 ** OTP_LENGTH;
  const code = crypto.randomInt(0, max);
  return String(code).padStart(OTP_LENGTH, "0");
}

function hashOtpCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function otpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MS);
}

module.exports = {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  generateOtpCode,
  hashOtpCode,
  otpExpiryDate,
};
