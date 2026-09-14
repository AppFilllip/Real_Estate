const { env } = require("../../config/env");

/**
 * Raw HTTP client for Twilio's Voice REST API
 * (https://api.twilio.com/2010-04-01/Accounts/{Sid}/Calls.json).
 *
 * ADAPT: if you swap telephony providers, this is the only file you need to
 * change — everything else in the module talks to it only through
 * placeCall()/isConfigured().
 */

function isConfigured() {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber && env.twilioWebhookBaseUrl);
}

/**
 * Places an outbound call from Twilio to `to`. Twilio fetches the actual
 * call instructions (what to say/dial) from `twimlUrl` once the call is
 * answered, and posts status updates to `statusCallbackUrl` as it progresses.
 *
 * @returns {Promise<{ started: boolean, providerCallSid?: string, error?: string }>}
 * Never throws.
 */
async function placeCall({ to, twimlUrl, statusCallbackUrl }) {
  if (!isConfigured()) return { started: false, error: "not_configured" };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Calls.json`;
  const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");

  const body = new URLSearchParams({
    To: to,
    From: env.twilioFromNumber,
    Url: twimlUrl,
    StatusCallback: statusCallbackUrl,
    StatusCallbackEvent: "initiated ringing answered completed",
    StatusCallbackMethod: "POST",
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { started: false, error: data.message || `http_${res.status}` };
    return { started: true, providerCallSid: data.sid };
  } catch (err) {
    return { started: false, error: err.message };
  }
}

module.exports = { placeCall, isConfigured };
