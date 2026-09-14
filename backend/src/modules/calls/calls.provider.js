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
  return Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber);
}

/**
 * Places an outbound call from Twilio to `to`. `twiml` is the call's
 * instructions passed inline (no public webhook needed to connect a call —
 * the destination is already known when we create it). `statusCallbackUrl`
 * is optional: pass it only when TWILIO_WEBHOOK_BASE_URL is configured, to
 * get live status/duration updates back; without it the call still connects
 * fine, we just don't hear back about how it went.
 *
 * @returns {Promise<{ started: boolean, providerCallSid?: string, error?: string }>}
 * Never throws.
 */
async function placeCall({ to, twiml, statusCallbackUrl }) {
  if (!isConfigured()) return { started: false, error: "not_configured" };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Calls.json`;
  const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");

  const params = { To: to, From: env.twilioFromNumber, Twiml: twiml };
  if (statusCallbackUrl) {
    params.StatusCallback = statusCallbackUrl;
    params.StatusCallbackEvent = "initiated ringing answered completed";
    params.StatusCallbackMethod = "POST";
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { started: false, error: data.message || `http_${res.status}` };
    return { started: true, providerCallSid: data.sid };
  } catch (err) {
    return { started: false, error: err.message };
  }
}

module.exports = { placeCall, isConfigured };
