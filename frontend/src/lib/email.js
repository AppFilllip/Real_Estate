import { toast } from "sonner";
import { api } from "../services/api";

/**
 * Prompts for a subject + body and sends it via POST /api/email/send.
 * Pass whichever of { leadId, customerId, email } identifies the recipient —
 * the backend resolves the email address itself when given a leadId/customerId.
 */
export async function sendEmailMessage({ leadId, customerId, email, label } = {}) {
  const subject = window.prompt(`Email subject to ${label || "send"}:`);
  if (!subject || !subject.trim()) return;
  const body = window.prompt("Email body:");
  if (!body || !body.trim()) return;

  try {
    const res = await api.post("/email/send", { leadId, customerId, email, subject: subject.trim(), body: body.trim() });
    if (res.data?.sent) {
      toast.success("Email sent.");
    } else {
      toast.error(res.data?.error === "not_configured" ? "Email is not connected yet." : "Email could not be delivered.");
    }
  } catch (err) {
    toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Could not send email.");
  }
}
