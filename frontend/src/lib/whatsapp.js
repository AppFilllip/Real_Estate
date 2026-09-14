import { openComposeDialog } from "./compose-dialog";

/**
 * Opens the compose dialog for a real WhatsApp send. Pass whichever of
 * { leadId, customerId, phone } identifies the recipient — the backend
 * resolves the phone number itself when given a leadId/customerId.
 */
export function sendWhatsAppMessage({ leadId, customerId, phone, label } = {}) {
  openComposeDialog({ channel: "whatsapp", leadId, customerId, phone, label });
}
