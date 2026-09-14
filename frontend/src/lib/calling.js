import { toast } from "sonner";
import { api } from "../services/api";

/**
 * Click-to-call via POST /api/calls/dial. Twilio rings the current user's
 * own phone first; once they pick up, it bridges to the lead/customer's
 * number. Nothing plays in the browser — answer your real phone to connect.
 */
export async function placeCall({ leadId, customerId } = {}) {
  try {
    const res = await api.post("/calls/dial", { leadId, customerId });
    toast.success(res.data?.message || "Calling you now.");
  } catch (err) {
    const message = err.response?.data?.error?.message;
    toast.error(message === "Calling isn't connected yet." ? message : message || "Could not start the call.");
  }
}
