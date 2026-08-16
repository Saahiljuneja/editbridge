"use client";

import { useEffect, useRef, useState } from "react";
import pusherClient from "@/lib/pusher-client";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { UploadZone } from "@/components/common/upload-zone";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Send, Paperclip, X, MessageSquareText, BookmarkPlus, Loader2 } from "lucide-react";

interface ResponseTemplate {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
}

interface ChatWindowProps {
  orderId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  otherPartyName: string;
  isEditor?: boolean;
  containerClassName?: string;
}

export function ChatWindow({
  orderId,
  currentUserId,
  initialMessages,
  otherPartyName,
  isEditor = false,
  containerClassName,
}: ChatWindowProps) {
  const [msgs, setMsgs] = useState<ChatMessage[]>(initialMessages);
  const [content, setContent] = useState("");
  const [attachKey, setAttachKey] = useState<string | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Response Template creation states
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateShortcut, setNewTemplateShortcut] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (!isEditor) return;
    fetch("/api/editor/response-templates")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setTemplates(d.templates ?? []); })
      .catch(() => {});
  }, [isEditor]);

  const pickerQuery = showPicker ? content.slice(1) : "";
  const filteredTemplates = templates.filter((t) => {
    if (!pickerQuery) return true;
    const q = pickerQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || (t.shortcut ?? "").includes(q);
  });

  function handleContentChange(value: string) {
    setContent(value);
    if (!isEditor) return;
    // Open the picker only when "/" is the very first character typed into an
    // empty box; close it the moment the text no longer starts with "/".
    if (value === "/") setShowPicker(true);
    else if (showPicker && !value.startsWith("/")) setShowPicker(false);
  }

  function insertTemplate(t: ResponseTemplate) {
    setContent(t.content);
    setShowPicker(false);
    textareaRef.current?.focus();
  }

  // Subscribe to Pusher channel
  useEffect(() => {
    const channel = pusherClient.subscribe(`private-order-${orderId}`);

    channel.bind("new-message", (data: ChatMessage) => {
      setMsgs((prev) => {
        // Deduplicate by id
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`private-order-${orderId}`);
    };
  }, [orderId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !attachKey) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          content: content.trim() || (attachName ? `Sent a file: ${attachName}` : ""),
          fileUrl: attachKey ?? undefined,
          fileName: attachName ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to send message.");
        return;
      }

      const message: ChatMessage = await res.json();
      // Append immediately (Pusher may also deliver it, dedup handles it)
      setMsgs((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      setContent("");
      setAttachKey(null);
      setAttachName(null);
      setShowAttach(false);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape" && showPicker) {
      e.preventDefault();
      setShowPicker(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  }

  async function handleSaveAsTemplate() {
    if (!content.trim()) return;
    if (!newTemplateTitle.trim()) {
      toast.error("Please enter a title for the template.");
      return;
    }
    if (newTemplateShortcut && !/^[a-z]+$/.test(newTemplateShortcut)) {
      toast.error("Shortcut must contain lowercase letters only.");
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await fetch("/api/editor/response-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTemplateTitle.trim(),
          content: content.trim(),
          shortcut: newTemplateShortcut.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error 
          ? (typeof data.error === "object" ? Object.values(data.error).flat().join(", ") : data.error) 
          : "Failed to save template";
        throw new Error(errMsg);
      }

      setTemplates((prev) => [...prev, data]);
      setNewTemplateTitle("");
      setNewTemplateShortcut("");
      setShowSaveTemplateModal(false);
      toast.success("Message saved as quick-reply template!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  return (
    <div className={cn(
      "flex flex-col rounded-[24px] border border-neutral-200/60 bg-white overflow-hidden relative shadow-none",
      containerClassName ?? "h-[calc(100vh-12rem)]"
    )}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-200/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white uppercase select-none">
          {otherPartyName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-xs text-neutral-800 uppercase tracking-wider">{otherPartyName}</p>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Order chat</p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {msgs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            No messages yet. Say hello!
          </p>
        )}
        {msgs.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isSelf={msg.senderId === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* File attachment zone */}
      {showAttach && (
        <div className="px-5 pb-3">
          {attachKey ? (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
              <span className="flex-1 truncate">{attachName}</span>
              <button
                onClick={() => { setAttachKey(null); setAttachName(null); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <UploadZone
              uploadType="delivery"
              label="Attach a file"
              accept="*/*"
              onUploaded={({ key }) => {
                setAttachKey(key);
                const parts = key.split("/");
                setAttachName(parts[parts.length - 1]);
              }}
            />
          )}
        </div>
      )}

      {/* Save Template Modal Overlay */}
      {showSaveTemplateModal && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm border border-neutral-200/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] space-y-4">
            <div>
              <p className="font-black text-black text-xs uppercase tracking-wider">Save as template</p>
              <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">This will add the current input text to your quick-reply menu.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-neutral-450 uppercase tracking-wider mb-1.5">Template Title</label>
                <input
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="e.g. Greeting, Follow-up"
                  maxLength={60}
                  className="w-full rounded-full border border-neutral-200 px-3.5 py-2 text-xs focus:outline-none focus:border-black placeholder:text-neutral-350"
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-neutral-450 uppercase tracking-wider mb-1.5">Shortcut (lowercase only, optional)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-450 text-xs">/</span>
                  <input
                    value={newTemplateShortcut}
                    onChange={(e) => setNewTemplateShortcut(e.target.value)}
                    placeholder="thanks"
                    maxLength={20}
                    className="w-full rounded-full border border-neutral-200 pl-6 pr-3.5 py-2 text-xs focus:outline-none focus:border-black placeholder:text-neutral-350"
                  />
                </div>
              </div>
              <div className="border border-neutral-100 rounded-2xl bg-neutral-50/50 p-3.5 text-[11px] text-neutral-500 max-h-24 overflow-y-auto italic">
                &ldquo;{content.trim()}&rdquo;
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                disabled={savingTemplate}
                className="px-5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-full text-neutral-600 font-bold uppercase tracking-wider text-[10px] cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsTemplate}
                disabled={savingTemplate || !newTemplateTitle.trim()}
                className="px-5 py-2 rounded-full text-white font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5 disabled:opacity-50 bg-black hover:bg-neutral-900 transition-all cursor-pointer"
              >
                {savingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="relative px-5 py-4 border-t border-neutral-200/60 flex items-end gap-2">
        {/* Response template "/" picker — editor-only */}
        {isEditor && showPicker && (
          <div className="absolute left-5 right-5 bottom-full mb-2 max-h-64 overflow-y-auto rounded-2xl border border-neutral-200/60 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-10">
            <div className="px-3 py-2 border-b border-neutral-100 flex items-center gap-1.5 text-[10px] font-black text-neutral-450 uppercase tracking-wide sticky top-0 bg-white">
              <MessageSquareText className="w-3.5 h-3.5" /> Response templates
            </div>
            {filteredTemplates.length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-450">
                {templates.length === 0
                  ? <>No templates yet — add some in <span className="font-semibold text-neutral-600">Settings → Templates</span>.</>
                  : "No matching templates."}
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => insertTemplate(t)}
                  className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-neutral-800">{t.title}</p>
                    {t.shortcut && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500">/{t.shortcut}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">{t.content}</p>
                </button>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAttach(!showAttach)}
          className={cn(
            "p-2.5 h-9 w-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-black hover:bg-neutral-50 transition-colors shrink-0 cursor-pointer",
            showAttach && "bg-neutral-100 text-black"
          )}
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {isEditor && content.trim().length > 0 && (
          <button
            type="button"
            onClick={() => setShowSaveTemplateModal(true)}
            className="p-2.5 h-9 w-9 flex items-center justify-center rounded-full text-neutral-400 hover:text-black hover:bg-neutral-50 transition-colors shrink-0 cursor-pointer"
            title="Save as quick-reply template"
            aria-label="Save as template"
          >
            <BookmarkPlus className="w-4 h-4" />
          </button>
        )}

        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isEditor
              ? `Message ${otherPartyName}… (Enter to send, "/" for templates)`
              : `Message ${otherPartyName}… (Enter to send, Shift+Enter for new line)`
          }
          className="min-h-[40px] max-h-36 resize-none flex-1"
          rows={1}
          maxLength={5000}
        />

        <button
          type="submit"
          disabled={sending || (!content.trim() && !attachKey)}
          className={cn(
            "bg-black hover:bg-neutral-900 text-white rounded-full h-9 w-9 flex items-center justify-center shrink-0 cursor-pointer transition-all",
            (sending || (!content.trim() && !attachKey)) && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
