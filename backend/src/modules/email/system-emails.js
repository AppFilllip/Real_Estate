const provider = require("./email.provider");

/**
 * System/transactional emails (OTP codes, invites) — sent directly via the
 * provider, deliberately bypassing email.service.js's Conversation/Message
 * flow. Those are for CRM comms with leads/customers; an OTP code or an
 * account invite isn't a "conversation" and shouldn't show up in Inbox.
 */

async function sendOtpEmail({ to, name, code }) {
  return provider.sendEmail({
    to,
    subject: "Your EstateOS sign-in code",
    body: `<p>Hi ${escapeHtml(name || "there")},</p><p>Your sign-in code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

async function sendInviteEmail({ to, name, companyName }) {
  return provider.sendEmail({
    to,
    subject: `You've been invited to ${companyName || "EstateOS"}`,
    body: `<p>Hi ${escapeHtml(name || "there")},</p><p>You've been added as a team member on ${escapeHtml(companyName || "EstateOS")}'s CRM.</p><p>To sign in, go to the login page and enter your email (${escapeHtml(to)}) — you'll receive a one-time code to sign in with, no password needed.</p>`,
  });
}

function escapeHtml(value) {
  return String(value || "").replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
}

module.exports = { sendOtpEmail, sendInviteEmail };
