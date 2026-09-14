import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { useApiData } from "../../hooks/use-api-data";
import { api } from "../../services/api";
import { cn } from "../../lib/utils";

const TABS = [
  { key: "", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "CLOSED", label: "Closed" },
];

const QUICK_REPLIES = ["Thank you!", "Checking, please hold.", "Sending details shortly.", "Can we schedule a visit?"];

function humanize(value) {
  return String(value || "").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function initials(name) {
  return String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function InboxScreen() {
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState("");

  const [conversationsResponse, , convLoading, , reloadConversations] = useApiData(
    "/conversations",
    { data: [] },
    { take: 100, ...(statusFilter ? { status: statusFilter } : {}) }
  );
  const conversations = Array.isArray(conversationsResponse) ? conversationsResponse : conversationsResponse.data || [];

  const [leadsResponse] = useApiData("/leads", { data: [] }, { take: 200 });
  const leads = Array.isArray(leadsResponse) ? leadsResponse : leadsResponse.data || [];
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  const [customersResponse] = useApiData("/customers", { data: [] }, { take: 200 });
  const customers = Array.isArray(customersResponse) ? customersResponse : customersResponse.data || [];
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) || null;
  const selectedLead = selected?.leadId ? leadById.get(selected.leadId) : null;
  const selectedCustomer = selected?.customerId ? customerById.get(selected.customerId) : null;
  const displayName = selectedLead?.name || selectedCustomer?.name || selected?.contactValue || "Conversation";

  const [messagesResponse, , messagesLoading, , reloadMessages] = useApiData(
    "/messages",
    { data: [] },
    { conversationId: selected?.id },
    { enabled: Boolean(selected?.id) }
  );
  const messages = Array.isArray(messagesResponse) ? messagesResponse : messagesResponse.data || [];

  async function sendMessage(text) {
    const body = (text ?? draft).trim();
    if (!body || !selected) return;
    try {
      const res = await api.post("/messages", { conversationId: selected.id, body });
      setDraft("");
      reloadMessages();
      reloadConversations();
      if (res.data?.sent) {
        toast.success("Message sent.");
      } else if (res.data?.error === "not_configured") {
        toast.error(`${humanize(selected.channel)} is not connected yet.`);
      } else if (res.data?.error === "channel_not_connected") {
        toast.error(`${humanize(selected.channel)} replies aren't wired up here yet.`);
      } else {
        toast.error("Message could not be delivered.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Could not send message.");
    }
  }

  return (
    <section className="mx-auto max-w-[1440px] space-y-4">
      <div>
        <div className="mb-0.5 text-xs text-[#8B93A1]">EstateOS / Inbox</div>
        <h1 className="font-display m-0 text-2xl font-semibold leading-8 tracking-normal text-[#101418]">Communication centre</h1>
      </div>

      <div className="grid h-[660px] grid-cols-[320px_minmax(0,1fr)_300px] overflow-hidden rounded-[10px] border border-[#E2E5EA] bg-white">
        <div className="flex min-w-0 flex-col border-r border-[#E2E5EA]">
          <div className="flex gap-1 border-b border-[#E2E5EA] p-2.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "rounded-full px-2.5 py-1.5 text-xs font-semibold",
                  statusFilter === tab.key ? "bg-[#E8EDFF] text-[#2E5BFF]" : "text-[#5B6472] hover:text-[#101418]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto">
            {convLoading && (
              <div className="space-y-1 p-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-8.5 w-8.5 flex-none rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!convLoading && conversations.length === 0 && <p className="p-4 text-sm text-[#5B6472]">No conversations.</p>}
            {conversations.map((conversation) => {
              const lead = conversation.leadId ? leadById.get(conversation.leadId) : null;
              const customer = conversation.customerId ? customerById.get(conversation.customerId) : null;
              const name = lead?.name || customer?.name || conversation.contactValue;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-[#EEF0F3] p-3 text-left",
                    selectedId === conversation.id ? "bg-[#F5F6F8]" : "hover:bg-[#F5F6F8]"
                  )}
                >
                  <div className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full bg-[#EEF0F3] text-[11.5px] font-bold text-[#5B6472]">
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold">{name}</span>
                      <span className="text-[11px] text-[#8B93A1]">{humanize(conversation.channel)}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-[#2E5BFF] px-1.5 text-[10px] font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[#5B6472]">{conversation.contactValue}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#5B6472]">Select a conversation.</div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 border-b border-[#E2E5EA] px-4 py-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{displayName}</div>
                  <div className="text-[11.5px] text-[#8B93A1]">
                    {humanize(selected.channel)} · {humanize(selected.status)}
                    {selected.sessionExpiresAt && new Date(selected.sessionExpiresAt) > new Date()
                      ? ` · session open`
                      : ""}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-[#F5F6F8] p-4">
                {messagesLoading && (
                  <div className="space-y-2.5">
                    <Skeleton className="h-10 w-2/3 rounded-lg" />
                    <Skeleton className="ml-auto h-10 w-1/2 rounded-lg" />
                    <Skeleton className="h-10 w-3/5 rounded-lg" />
                  </div>
                )}
                {!messagesLoading && messages.length === 0 && <p className="text-sm text-[#5B6472]">No messages yet.</p>}
                <div className="flex flex-col gap-2.5">
                  {messages.map((message) => {
                    const outbound = message.direction === "OUTBOUND";
                    return (
                      <div key={message.id} className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-3 py-2",
                            outbound ? "bg-[#2E5BFF] text-white" : "border border-[#E2E5EA] bg-white"
                          )}
                        >
                          <div className="text-[13px] leading-[19px]">{message.body}</div>
                          <div className={cn("mt-1 text-[10.5px]", outbound ? "text-[#BFCEFF]" : "text-[#8B93A1]")}>
                            {formatTime(message.sentAt || message.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-[#E2E5EA] p-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => setDraft(reply)}
                      className="rounded-full border border-[#E2E5EA] px-2.5 py-1.5 font-mono-ui text-[11.5px] text-[#2E5BFF] hover:bg-[#E8EDFF]"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message…"
                    className="h-[52px] flex-1 resize-none rounded-md border border-[#E2E5EA] px-3 py-2.5 text-[13px] outline-none"
                  />
                  <Button onClick={() => sendMessage()}>Send</Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 overflow-auto border-l border-[#E2E5EA] p-4.5">
          {selectedLead ? (
            <>
              <div>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8B93A1]">Lead</p>
                <p className="text-sm font-semibold">{selectedLead.name}</p>
                <p className="text-xs text-[#5B6472]">
                  {humanize(selectedLead.stage)} · {selectedLead.project?.name || "-"} · score {selectedLead.score}
                </p>
              </div>
              <ContextRow label="Phone" value={selectedLead.phone} />
              <ContextRow label="City" value={selectedLead.city || "-"} />
              <ContextRow label="Source" value={selectedLead.source?.name || "-"} />
              <ContextRow label="Owner" value={selectedLead.owner?.name || "Unassigned"} />
            </>
          ) : selectedCustomer ? (
            <div>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#8B93A1]">Customer</p>
              <p className="text-sm font-semibold">{selectedCustomer.name}</p>
              <p className="text-xs text-[#5B6472]">{selectedCustomer.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-[#5B6472]">No linked lead or customer.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="rounded-lg border border-[#E2E5EA] p-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8B93A1]">{label}</p>
      <p className="mt-0.5 text-[12.5px] font-semibold">{value}</p>
    </div>
  );
}
