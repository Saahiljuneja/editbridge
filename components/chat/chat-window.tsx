"use client";

import { useEffect, useRef, useState } from "react";
import pusherClient from "@/lib/pusher-client";
import { MessageBubble, type ChatMessage } from "./message-bubble";
import { UploadZone } from "@/components/common/upload-zone";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Send, Paperclip, X, MessageSquareText } from "lucide-react";

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
  // Response-template "/" picker is editor-only — client chat input is unchanged.
  isEditor?: boolean;
}

export function ChatWindow({
  orderId,
  currentUserId,
  initialMessages,
  otherPartyName,
  isEditor = false,
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

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] rounded-2xl border border-border bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center text-xs font-semibold text-[#0EA5E9]">
          {otherPartyName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-sm">{otherPartyName}</p>
          <p className="text-xs text-muted-foreground">Order chat</p>
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

      {/* Input */}
      <form onSubmit={handleSend} className="relative px-5 py-4 border-t border-border flex items-end gap-2">
        {/* Response template "/" picker — editor-only */}
        {isEditor && showPicker && (
          <div className="absolute left-5 right-5 bottom-full mb-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-white shadow-lg z-10">
            <div className="px-3 py-2 border-b border-gray-50 flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide sticky top-0 bg-white">
              <MessageSquareText className="w-3.5 h-3.5" /> Response templates
            </div>
            {filteredTemplates.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400">
                {templates.length === 0
                  ? <>No templates yet — add some in <span className="font-medium text-gray-500">Settings → Templates</span>.</>
                  : "No matching templates."}
              </p>
            ) : (
              filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => insertTemplate(t)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{t.title}</p>
                    {t.shortcut && (
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">/{t.shortcut}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{t.content}</p>
                </button>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAttach(!showAttach)}
          className={cn(
            "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0",
            showAttach && "bg-muted text-foreground"
          )}
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

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
          className="min-h-[44px] max-h-36 resize-none flex-1"
          rows={1}
          maxLength={5000}
        />

        <button
          type="submit"
          disabled={sending || (!content.trim() && !attachKey)}
          className={cn(
            buttonVariants({ size: "sm" }),
            "bg-[#0EA5E9] hover:bg-[#3d34a0] shrink-0 px-3",
            (sending || (!content.trim() && !attachKey)) && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
