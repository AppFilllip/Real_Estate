import { openComposeDialog } from "./compose-dialog";

/**
 * Opens the compose dialog for a real email send. Pass whichever of
 * { leadId, customerId, email } identifies the recipient — the backend
 * resolves the email address itself when given a leadId/customerId.
 */
export function sendEmailMessage({ leadId, customerId, email, label } = {}) {
  openComposeDialog({ channel: "email", leadId, customerId, email, label });
}
