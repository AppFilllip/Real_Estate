const { env } = require("../../config/env");

/**
 * Raw HTTP client for the "linked WhatsApp session" gateway
 * (waba.api.lumotis.com-style BSP — a hosted service that drives an actual
 * logged-in WhatsApp number, not Meta's official Business Cloud API).
 *
 * ADAPT: if your gateway's URL/payload shape differs, this is the only file
 * you need to change — everything else in the module talks to it only
 * through sendText()/isConfigured()/tokenExpiresAt().
 */

function normalizeNumber(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `${env.whatsappDefaultCountryCode}${digits}`;
  return digits;
}

/** Decode (without verifying) a JWT's `exp` claim — the gateway token expires roughly every 7 days. */
function tokenExpiresAt() {
  const token = env.whatsappToken;
  if (!token || token.split(".").length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch (err) {
    return null;
  }
}

function isTokenExpired() {
  const exp = tokenExpiresAt();
  return exp ? exp.getTime() <= Date.now() : false;
}

function isConfigured() {
  return Boolean(env.whatsappApiUrl && env.whatsappSessionId && env.whatsappToken) && !isTokenExpired();
}

/**
 * @returns {Promise<{ sent: boolean, providerMessageId?: string, error?: string }>}
 * Never throws.
 */
async function sendText({ to, text }) {
  if (!isConfigured()) return { sent: false, error: "not_configured" };

  const normalized = normalizeNumber(to);
  if (!normalized) return { sent: false, error: "invalid_number" };

  try {
    const url = `${env.whatsappApiUrl}/api/v1/sessions/${env.whatsappSessionId}/chats/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.whatsappToken}`,
      },
      body: JSON.stringify({ to: normalized, text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `http_${res.status}:${body.slice(0, 200)}` };
    }

    const data = await res.json().catch(() => ({}));
    return { sent: true, providerMessageId: data.id || data.messageId };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

module.exports = { sendText, isConfigured, normalizeNumber, tokenExpiresAt, isTokenExpired };
