"use client";

import { useEffect, useState, useRef } from "react";
import {
  MessageSquare, Plus, CheckCircle2, HelpCircle,
  Send, Clock, X, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderImage: string | null;
  senderRole: string;
};

const CATEGORIES = [
  { value: "billing",   label: "Billing & Subscriptions" },
  { value: "technical", label: "Technical Issue" },
  { value: "order",     label: "Order & Editor Matching" },
  { value: "general",   label: "General Inquiry" },
];

export function SupportContent() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMsgBody, setNewMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("general");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async (selectFirst = false) => {
    try {
      const res = await fetch("/api/support/tickets");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Ticket[];
      setTickets(data);
      if (selectFirst && data.length > 0 && !selectedTicket) setSelectedTicket(data[0]);
    } catch {
      toast.error("Could not fetch support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`);
      if (!res.ok) throw new Error();
      setMessages((await res.json()) as Message[]);
    } catch {
      toast.error("Could not load conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { fetchTickets(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedTicket) return;
    fetchMessages(selectedTicket.id);
    const interval = setInterval(() => {
      fetch(`/api/support/tickets/${selectedTicket.id}/messages`)
        .then(r => r.json()).then(d => setMessages(d as Message[])).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedTicket]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgBody.trim() || !selectedTicket || sendingMsg) return;
    setSendingMsg(true);
    const bodyText = newMsgBody;
    setNewMsgBody("");
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyText }),
      });
      if (!res.ok) throw new Error();
      await fetchMessages(selectedTicket.id);
      fetchTickets();
    } catch {
      toast.error("Message failed to send.");
      setNewMsgBody(bodyText);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ticket marked as resolved");
      setSelectedTicket(prev => prev ? { ...prev, status: "resolved" } : null);
      fetchTickets();
    } catch {
      toast.error("Could not resolve ticket.");
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim() || creatingTicket) return;
    setCreatingTicket(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newTicketSubject, category: newTicketCategory, message: newTicketMessage }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const data = await res.json() as { ticketId: string };
      toast.success("Support ticket opened successfully!");
      setIsModalOpen(false);
      setNewTicketSubject("");
      setNewTicketMessage("");
      await fetchTickets();
      const res2 = await fetch("/api/support/tickets");
      const list2 = await res2.json() as Ticket[];
      const found = list2.find(t => t.id === data.ticketId);
      if (found) setSelectedTicket(found);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to open support ticket.");
    } finally {
      setCreatingTicket(false);
    }
  };

  const openCount = tickets.filter(t => t.status !== "resolved").length;
  const resolvedCount = tickets.filter(t => t.status === "resolved").length;

  return (
    <>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-black text-neutral-900 tracking-tight leading-none">Support Tickets</h2>
            </div>
            <p className="text-xs text-neutral-400 font-bold mt-1">Submit inquiries and talk to our support specialists.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" /> Create Ticket
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Tickets</p>
              <p className="text-3xl font-black text-neutral-900 leading-none">{tickets.length}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-50 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-neutral-500" />
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Tickets</p>
              <p className="text-3xl font-black text-amber-600 leading-none">{openCount}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-neutral-200/60 p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Resolved Tickets</p>
              <p className="text-3xl font-black text-emerald-600 leading-none">{resolvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Master Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: tickets list */}
          <div className="lg:col-span-4 bg-white border border-neutral-200/60 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[550px]">
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Your Ticket History</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 scrollbar-none">
              {loadingTickets ? (
                <div className="p-6 text-center text-xs text-neutral-400 font-bold">Loading ticket log...</div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                  <HelpCircle className="w-8 h-8 text-neutral-300" />
                  <p className="text-xs font-bold text-neutral-700">No support tickets found</p>
                  <p className="text-[10px] text-neutral-400 leading-normal max-w-[160px] text-center">
                    Have questions? Create a ticket to start a dialog with us.
                  </p>
                </div>
              ) : (
                tickets.map(t => {
                  const isActive = selectedTicket?.id === t.id;
                  const isClosed = t.status === "resolved";
                  return (
                    <button key={t.id} onClick={() => setSelectedTicket(t)}
                      className={cn("w-full text-left p-4 transition-all flex flex-col gap-2 relative",
                        isActive ? "bg-violet-50/65" : "hover:bg-neutral-50/50")}>
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-600" />}
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider leading-none",
                          isClosed ? "bg-emerald-50 text-emerald-600"
                            : t.status === "in_progress" ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600")}>
                          {t.status.replace("_", " ")}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-bold">
                          {new Date(t.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className={cn("text-xs font-black truncate leading-snug",
                        isActive ? "text-violet-900" : "text-neutral-800")}>{t.subject}</p>
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-neutral-400">
                        <span className="uppercase">{t.category}</span>
                        <span>·</span>
                        <span className="capitalize">{t.priority} Priority</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: chat */}
          <div className="lg:col-span-8 bg-white border border-neutral-200/60 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[550px]">
            {selectedTicket ? (
              <>
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-neutral-800 truncate">{selectedTicket.subject}</p>
                    <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                      Category: <span className="uppercase text-neutral-500 font-bold">{selectedTicket.category}</span>
                    </p>
                  </div>
                  {selectedTicket.status !== "resolved" && (
                    <button onClick={handleResolveTicket}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-[10px] font-black uppercase text-neutral-700 transition-colors shadow-sm shrink-0">
                      Mark Resolved
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 scrollbar-none">
                  {loadingMessages ? (
                    <div className="text-center text-xs text-neutral-400 py-10 font-bold">Loading conversation...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-xs text-neutral-400 py-10">No messages in this ticket.</div>
                  ) : (
                    messages.map(m => {
                      const isMe = m.senderId === selectedTicket.userId;
                      const isStaff = m.senderRole === "admin" || m.senderRole?.startsWith("staff_");
                      return (
                        <div key={m.id} className={cn("flex items-start gap-2.5 max-w-[85%]",
                          isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shrink-0 border select-none",
                            isMe ? "bg-violet-100 border-violet-200/50 text-violet-700"
                              : isStaff ? "bg-amber-100 border-amber-200/50 text-amber-700"
                              : "bg-neutral-100 border-neutral-200 text-neutral-600")}>
                            {m.senderName.slice(0, 2)}
                          </div>
                          <div className="space-y-1">
                            <div className={cn("flex items-center gap-1.5 text-[9px] font-bold text-neutral-400",
                              isMe ? "justify-end" : "")}>
                              <span>{m.senderName}</span>
                              {isStaff && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200/50 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                  Support Agent
                                </span>
                              )}
                              <span>·</span>
                              <span>{new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                            </div>
                            <div className={cn("p-3 rounded-2xl text-xs font-bold shadow-sm leading-relaxed whitespace-pre-wrap",
                              isMe ? "bg-violet-600 text-white rounded-tr-none"
                                : "bg-white border border-neutral-200/60 text-neutral-800 rounded-tl-none")}>
                              {m.body}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-neutral-100">
                  {selectedTicket.status === "resolved" && (
                    <div className="bg-neutral-50 rounded-2xl border border-neutral-200/60 p-3.5 flex items-center justify-center gap-2 mb-3">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs text-neutral-500 font-bold text-center">
                        This ticket has been resolved. Replying will re-open it.
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input type="text" value={newMsgBody} onChange={e => setNewMsgBody(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 text-xs font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-violet-600 transition-all shadow-sm" />
                    <button type="submit" disabled={!newMsgBody.trim() || sendingMsg}
                      className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 shrink-0">
                      {sendingMsg
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-neutral-800">Support Chat log</p>
                  <p className="text-xs text-neutral-400 font-bold mt-1 leading-normal max-w-sm">
                    Select a support ticket from the history list to view message logs and communicate with support.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-neutral-200/60 shadow-2xl w-full max-w-lg p-6 space-y-5 relative">
            <button onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-neutral-50 text-neutral-400 hover:text-neutral-700 transition-all">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-black text-neutral-900 tracking-tight leading-none flex items-center gap-1.5">
                <MessageSquare className="w-5 h-5 text-violet-600" /> Create Support Ticket
              </h3>
              <p className="text-xs text-neutral-400 font-bold mt-1">Please describe your request and category.</p>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Category</label>
                <select value={newTicketCategory} onChange={e => setNewTicketCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 text-xs font-bold text-neutral-700 focus:outline-none focus:border-violet-600 transition-all shadow-sm">
                  {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Subject</label>
                <input type="text" required value={newTicketSubject} onChange={e => setNewTicketSubject(e.target.value)}
                  placeholder="e.g. Invoicing error on Order #123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 text-xs font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-violet-600 transition-all shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Description</label>
                <textarea required rows={4} value={newTicketMessage} onChange={e => setNewTicketMessage(e.target.value)}
                  placeholder="Please describe your inquiry in detail..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 text-xs font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-violet-600 transition-all shadow-sm" />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-black text-neutral-700 transition-colors shadow-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creatingTicket || !newTicketSubject.trim() || !newTicketMessage.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-40">
                  {creatingTicket
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    : "Open Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
