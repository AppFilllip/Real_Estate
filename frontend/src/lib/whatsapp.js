import { toast } from "sonner";
import { api } from "../services/api";

/**
 * Prompts for a message and sends it via POST /api/whatsapp/send.
 * Pass whichever of { leadId, customerId, phone } identifies the recipient —
 * the backend resolves the phone number itself when given a leadId/customerId.
 */
export async function sendWhatsAppMessage({ leadId, customerId, phone, label } = {}) {
  const text = window.prompt(`WhatsApp message to ${label || "send"}:`);
  if (!text || !text.trim()) return;

  try {
    const res = await api.post("/whatsapp/send", { leadId, customerId, phone, text: text.trim() });
    if (res.data?.sent) {
      toast.success("WhatsApp message sent.");
    } else {
      toast.error(res.data?.error === "not_configured" ? "WhatsApp is not connected yet." : "Message could not be delivered.");
    }
  } catch (err) {
    toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Could not send WhatsApp message.");
  }
}
