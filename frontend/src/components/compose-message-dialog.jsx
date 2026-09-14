import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Input } from "./ui/input";
import { setComposeDialogListener } from "../lib/compose-dialog";

const CHANNEL_LABEL = { whatsapp: "WhatsApp", email: "Email" };

export function ComposeMessageDialog() {
  const [target, setTarget] = useState(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setComposeDialogListener((payload) => {
      setTarget(payload);
      setSubject("");
      setBody("");
    });
    return () => setComposeDialogListener(null);
  }, []);

  function close() {
    setTarget(null);
  }

  async function send(event) {
    event.preventDefault();
    if (!target) return;
    if (!body.trim()) return;
    if (target.channel === "email" && !subject.trim()) return;

    setSending(true);
    try {
      const endpoint = target.channel === "whatsapp" ? "/whatsapp/send" : "/email/send";
      const payload =
        target.channel === "whatsapp"
          ? { leadId: target.leadId, customerId: target.customerId, phone: target.phone, text: body.trim() }
          : { leadId: target.leadId, customerId: target.customerId, email: target.email, subject: subject.trim(), body: body.trim() };

      const res = await api.post(endpoint, payload);
      if (res.data?.sent) {
        toast.success(`${CHANNEL_LABEL[target.channel]} message sent.`);
        close();
      } else {
        toast.error(res.data?.error === "not_configured" ? `${CHANNEL_LABEL[target.channel]} is not connected yet.` : "Message could not be delivered.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  if (!target) return null;

  return (
    <Dialog
      open
      title={`${CHANNEL_LABEL[target.channel]} to ${target.label || "contact"}`}
      description={target.channel === "whatsapp" ? "Sends a real WhatsApp message right now." : "Sends a real email right now."}
      onClose={close}
      className="max-w-lg"
    >
      <form className="space-y-4" onSubmit={send}>
        {target.channel === "email" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <Input value={subject} onChange={(event) => setSubject(event.target.value)} required />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Message</label>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={7}
            required
            placeholder={target.channel === "email" ? "Hi <name>,\n\n<message>\n\nRegards,\n<your name>" : "Type your message…"}
            className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
          {target.channel === "email" && (
            <p className="text-xs text-slate-400">Blank lines start a new paragraph; single line breaks are preserved.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
