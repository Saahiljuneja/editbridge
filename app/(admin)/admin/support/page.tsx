"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { 
  MessageSquare, CheckCircle2, AlertCircle, Clock, 
  Send, User, Mail, ShieldAlert, Sparkles, Filter, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";

type Ticket = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
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

const ALLOWED_ROLES = ["admin", "staff_support"];

export default function AdminSupportDashboard() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMsgBody, setNewMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth Guard
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchTickets = async (selectFirst = false) => {
    try {
      const res = await fetch("/api/support/tickets");
      if (!res.ok) throw new Error("Failed to load tickets");
      const data = (await res.json()) as Ticket[];
      setTickets(data);
      if (selectFirst && data.length > 0) {
        setSelectedTicket(data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not fetch support tickets.");
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = (await res.json()) as Message[];
      setMessages(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load conversation.");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      if (!ALLOWED_ROLES.includes(session?.user?.role || "")) {
        redirect("/client/dashboard");
      }
      fetchTickets(true);
    }
  }, [status, session]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      
      const interval = setInterval(() => {
        if (selectedTicket) {
          fetch(`/api/support/tickets/${selectedTicket.id}/messages`)
            .then((r) => r.json())
            .then((data) => setMessages(data as Message[]))
            .catch(() => {});
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (!res.ok) throw new Error("Failed to send message");
      
      await fetchMessages(selectedTicket.id);
      fetchTickets();
    } catch (err) {
      console.error(err);
      toast.error("Failed to send reply.");
      setNewMsgBody(bodyText);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "open" | "in_progress" | "resolved") => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Ticket marked as ${newStatus}`);
      setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
      fetchTickets();
    } catch (err) {
      console.error(err);
      toast.error("Could not update status.");
    }
  };

  const handleUpdatePriority = async (newPriority: "low" | "medium" | "high") => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) throw new Error("Failed to update priority");
      toast.success(`Priority updated to ${newPriority}`);
      setSelectedTicket((prev) => prev ? { ...prev, priority: newPriority } : null);
      fetchTickets();
    } catch (err) {
      console.error(err);
      toast.error("Could not update priority.");
    }
  };

  if (status === "loading" || loadingTickets) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-xs text-brand-primary font-extrabold tracking-widest uppercase animate-pulse">Loading support desk...</p>
        </div>
      </div>
    );
  }

  // Apply filters
  const filteredTickets = tickets.filter((t) => {
    const statusMatch = statusFilter === "all" || t.status === statusFilter;
    const priorityMatch = priorityFilter === "all" || t.priority === priorityFilter;
    const categoryMatch = categoryFilter === "all" || t.category === categoryFilter;
    return statusMatch && priorityMatch && categoryMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50/30 pb-12 select-none relative">
      
      {/* Background ambient glowing gradient */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-blue-100/35 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Page Header */}
        <div className="bg-white rounded-3xl border border-gray-150 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-gray-100/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-5 h-5 text-brand-primary" />
              <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Support Desk</h1>
            </div>
            <p className="text-xs text-gray-400 font-bold mt-1">Manage, moderate, and resolve active client and editor support tickets.</p>
          </div>
          <button
            onClick={() => fetchTickets()}
            className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Board
          </button>
        </div>

        {/* Filters control block */}
        <div className="bg-white rounded-3xl border border-gray-150 p-5 shadow-xl shadow-gray-100/20 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-extrabold uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-sm cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-sm cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-sm cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="billing">Billing & Financials</option>
                <option value="technical">Technical Issues</option>
                <option value="order">Order Assistance</option>
                <option value="general">General Inquiries</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-400 font-extrabold tracking-wider uppercase">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </p>
        </div>

        {/* Master Details Work Board */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left: Tickets List */}
          <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-xl shadow-gray-100/20 flex flex-col h-[600px]">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tickets Board</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 scrollbar-none">
              {filteredTickets.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400 font-bold">
                  No matching tickets on this filter.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isActive = selectedTicket?.id === t.id;
                  const isClosed = t.status === "resolved";
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={cn(
                        "w-full text-left p-4.5 transition-all flex flex-col gap-2 relative cursor-pointer",
                        isActive ? "bg-blue-50/65" : "hover:bg-neutral-50/50"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider leading-none",
                          isClosed 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100/50" 
                            : t.status === "in_progress"
                            ? "bg-blue-50 text-brand-primary border border-blue-100/50"
                            : "bg-amber-50 text-amber-600 border border-amber-100/50"
                        )}>
                          {t.status.replace("_", " ")}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold">
                          {new Date(t.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <p className={cn(
                        "text-xs font-black truncate leading-snug",
                        isActive ? "text-blue-950" : "text-gray-800"
                      )}>
                        {t.subject}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-400">
                        <div className="flex items-center gap-1">
                          <span className="uppercase text-gray-500">{t.category}</span>
                          <span>·</span>
                          <span className={cn(
                            "capitalize font-bold",
                            t.priority === "high" ? "text-red-500" : t.priority === "medium" ? "text-blue-800" : "text-gray-400"
                          )}>{t.priority}</span>
                        </div>
                        <span className="truncate max-w-[120px] font-bold text-gray-500">By {t.userName}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Ticket Conversation Desk */}
          <div className="lg:col-span-8 bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-xl shadow-gray-100/20 flex flex-col h-[600px]">
            {selectedTicket ? (
              <>
                {/* Chat Panel Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{selectedTicket.subject}</p>
                    
                    {/* User info row */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-0.5">
                        <User className="w-3 h-3 text-brand-primary" /> {selectedTicket.userName} ({selectedTicket.userRole})
                      </span>
                      <span className="text-gray-200 text-xs select-none">·</span>
                      <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-0.5">
                        <Mail className="w-3 h-3 text-brand-primary" /> {selectedTicket.userEmail}
                      </span>
                    </div>
                  </div>

                  {/* Actions Dropdowns */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Select */}
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    {/* Priority Select */}
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdatePriority(e.target.value as any)}
                      className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                {/* Messages Board */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30 scrollbar-none">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <div className="w-6 h-6 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin" />
                      <p className="text-[10px] text-brand-primary font-bold uppercase animate-pulse">Syncing chat...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-10">No message history found.</div>
                  ) : (
                    messages.map((m) => {
                      const isAgent = m.senderRole === "admin" || m.senderRole?.startsWith("staff_");
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "flex items-start gap-2.5 max-w-[85%]",
                            isAgent ? "ml-auto flex-row-reverse" : "mr-auto"
                          )}
                        >
                          {/* Sender Initials */}
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shrink-0 border select-none",
                            isAgent 
                              ? "bg-blue-100 border-blue-200/50 text-blue-900" 
                              : "bg-gray-100 border-gray-200 text-gray-600"
                          )}>
                            {m.senderName.slice(0, 2)}
                          </div>

                          <div className="space-y-1">
                            <div className={cn(
                              "flex items-center gap-1.5 text-[9px] font-bold text-gray-400",
                              isAgent ? "justify-end" : ""
                            )}>
                              <span>{m.senderName}</span>
                              <span className="bg-gray-50 text-gray-500 border border-gray-200/50 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded">
                                {m.senderRole}
                              </span>
                              <span>·</span>
                              <span>
                                {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </div>

                            <div className={cn(
                              "p-3 rounded-2xl text-xs font-semibold shadow-sm leading-relaxed whitespace-pre-wrap",
                              isAgent
                                ? "bg-brand-primary text-white rounded-tr-none"
                                : "bg-white border border-gray-200/60 text-gray-800 rounded-tl-none"
                            )}>
                              {m.body}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Panel */}
                <div className="p-4 border-t border-gray-100">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMsgBody}
                      onChange={(e) => setNewMsgBody(e.target.value)}
                      placeholder="Type a support reply..."
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-xs font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newMsgBody.trim() || sendingMsg}
                      className="w-10 h-10 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white flex items-center justify-center transition-all shadow-md shadow-blue-800/15 disabled:opacity-40 disabled:hover:bg-brand-primary shrink-0 cursor-pointer animate-none"
                    >
                      {sendingMsg ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center animate-pulse border border-blue-100">
                  <MessageSquare className="w-7 h-7 text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Support Conversation Desk</p>
                  <p className="text-xs text-gray-400 font-bold mt-1.5 leading-normal max-w-sm">
                    Select a support ticket from the board to view chat logs, converse with the user, adjust ticket priority, or mark it as resolved.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
