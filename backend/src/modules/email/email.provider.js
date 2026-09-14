const { env } = require("../../config/env");

/**
 * Raw HTTP client for ZeptoMail's transactional send API
 * (https://api.zeptomail.com/v1.1/email — Zoho's send-only email service).
 *
 * ADAPT: if you swap providers, this is the only file you need to change —
 * everything else in the module talks to it only through sendEmail()/isConfigured().
 * Note: ZeptoMail is send-only — there's no inbound-email equivalent to
 * WhatsApp's webhook, so replies land in your real inbox, not this CRM.
 */

function isConfigured() {
  return Boolean(env.zeptoToken && env.zeptoFromEmail);
}

/**
 * @returns {Promise<{ sent: boolean, providerMessageId?: string, error?: string }>}
 * Never throws.
 */
async function sendEmail({ to, subject, body }) {
  if (!isConfigured()) return { sent: false, error: "not_configured" };
  if (!to) return { sent: false, error: "invalid_recipient" };

  try {
    const res = await fetch(env.zeptoApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: env.zeptoToken,
      },
      body: JSON.stringify({
        from: { address: env.zeptoFromEmail, name: env.zeptoFromName },
        to: [{ email_address: { address: to } }],
        subject,
        htmlbody: body,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { sent: false, error: `http_${res.status}:${errBody.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => ({}));
    return { sent: true, providerMessageId: data.request_id || data.data?.[0]?.additional_info?.[0]?.message_id };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail, isConfigured };
