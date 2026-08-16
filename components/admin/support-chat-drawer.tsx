"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send, Plus, Loader } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils";

type SupportMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: SupportMessage[];
};

export function SupportChatDrawer({ userId, userName }: { userId: string; userName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicketId, tickets]);

  async function loadTickets() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/chat`);
      if (res.ok) {
        const d = await res.json();
        setTickets(d.tickets || []);
        if (d.tickets.length > 0 && !activeTicketId) {
          setActiveTicketId(d.tickets[0].id);
        }
      }
    } catch {
      toast.error("Failed to load support chat history.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;
    const body = {
      action: "send_message",
      ticketId: activeTicketId,
      bodyText: replyText,
    };
    try {
      const res = await fetch(`/api/admin/users/${userId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setTickets((prev) =>
          prev.map((t) =>
            t.id === activeTicketId
              ? { ...t, messages: [...t.messages, d.message] }
              : t
          )
        );
        setReplyText("");
      } else {
        toast.error("Failed to send message.");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newBody.trim()) return;
    const body = {
      action: "create_ticket",
      subject: newSubject,
      bodyText: newBody,
    };
    try {
      const res = await fetch(`/api/admin/users/${userId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setTickets((prev) => [d.ticket, ...prev]);
        setActiveTicketId(d.ticket.id);
        setNewSubject("");
        setNewBody("");
        setCreatingTicket(false);
        toast.success("New assistance ticket initiated!");
      }
    } catch {
      toast.error("Failed to create ticket.");
    }
  }

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer"
      >
        <MessageSquare className="w-4 h-4 text-teal-600" /> Support Chat Drawer
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex justify-end animate-fade-in">
          <div className="bg-white w-full max-w-lg h-full flex flex-col shadow-2xl relative">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-neutral-900 text-white">
              <div>
                <p className="font-semibold text-sm">Assistance & Support: {userName}</p>
                <p className="text-[10px] text-gray-300">Read & send live support ticket messages</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden flex">
              
              {/* Left Column: Tickets List */}
              <div className="w-1/3 border-r border-gray-100 flex flex-col bg-neutral-50/50">
                <div className="p-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tickets</span>
                  <button
                    onClick={() => setCreatingTicket(true)}
                    className="p-1 hover:bg-gray-200 rounded text-teal-600 cursor-pointer"
                    title="New Support Thread"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setActiveTicketId(t.id);
                          setCreatingTicket(false);
                        }}
                        className={`w-full text-left p-3 hover:bg-gray-100 transition-colors flex flex-col gap-1 cursor-pointer ${
                          activeTicketId === t.id ? "bg-teal-50/50 border-l-2 border-teal-500" : ""
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-900 truncate">{t.subject}</span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full inline-block self-start ${
                          t.status === "open" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
                        }`}>
                          {t.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Chat window */}
              <div className="flex-1 flex flex-col h-full bg-white">
                {creatingTicket ? (
                  <form onSubmit={handleCreateTicket} className="p-4 space-y-3 flex-1 overflow-y-auto">
                    <p className="text-xs font-bold text-gray-800">Start Direct Assistance Thread</p>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Subject</label>
                      <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        required
                        placeholder="e.g. Account Verification Issue"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Message Brief</label>
                      <textarea
                        value={newBody}
                        onChange={(e) => setNewBody(e.target.value)}
                        required
                        rows={4}
                        placeholder="Explain the topic details..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Start Thread
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreatingTicket(false)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-650 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : activeTicket ? (
                  <>
                    {/* Active Ticket Details */}
                    <div className="p-3 border-b border-gray-100 bg-neutral-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">Thread: {activeTicket.subject}</span>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/20">
                      {activeTicket.messages.map((msg) => {
                        const isSelf = msg.senderId !== userId;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] ${
                              isSelf ? "self-end items-end ml-auto" : "self-start items-start mr-auto"
                            }`}
                          >
                            <div
                              className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                                isSelf
                                  ? "bg-teal-650 text-white rounded-tr-none"
                                  : "bg-white border border-gray-150 text-gray-800 rounded-tl-none"
                              }`}
                            >
                              {msg.body}
                            </div>
                            <span className="text-[9px] text-gray-400 mt-1 font-mono">
                              {formatDateTime(new Date(msg.createdAt))}
                            </span>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Reply Form */}
                    <form onSubmit={handleSendReply} className="p-3 border-t border-gray-100 flex gap-2 bg-white">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type assistance message..."
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50/10">
                    <MessageSquare className="w-8 h-8 text-gray-250 mb-2" />
                    <p className="text-xs text-muted-foreground">Select a support ticket from the list or click '+' to start a new chat thread.</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
