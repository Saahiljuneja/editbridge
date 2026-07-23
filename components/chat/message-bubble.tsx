import { cn, formatDateTime } from "@/lib/utils";
import { AlertTriangle, Ban, Download } from "lucide-react";
import { getPublicUrl } from "@/lib/r2";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  isWarning: boolean;
  isBlocked: boolean;
  blockedReason: string | null;
  warningsUsed?: number;
  warningsLeft?: number;
  createdAt: string | Date;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isSelf: boolean;
}

export function MessageBubble({ message, isSelf }: MessageBubbleProps) {
  // Hard blocked — hidden from both parties
  if (message.isBlocked) {
    return (
      <div className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
        <div className="flex items-start gap-1.5 max-w-[75%]">
          <Ban className="w-3.5 h-3.5 text-red-400 shrink-0 mt-1" />
          <div className="rounded-xl px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-600">
            {isSelf
              ? "Your message was blocked. Repeated policy violations may result in account suspension."
              : "A message was blocked by the platform content filter."}
          </div>
        </div>
      </div>
    );
  }

  // Warning — only sender sees this; recipient never receives the event
  if (message.isWarning && isSelf) {
    const left = message.warningsLeft ?? 0;
    return (
      <div className="flex justify-end">
        <div className="flex items-start gap-1.5 max-w-[75%]">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-1" />
          <div className="rounded-xl px-3 py-2 bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-0.5">
            <p className="font-semibold">Warning — message not delivered</p>
            <p>{message.blockedReason}</p>
            {left > 0
              ? <p className="text-amber-500">{left} warning{left !== 1 ? "s" : ""} remaining before your messages are blocked.</p>
              : <p className="text-red-500 font-medium">This was your final warning. Further violations will be blocked.</p>
            }
          </div>
        </div>
      </div>
    );
  }

  // Warning message should be invisible to the other party
  if (message.isWarning && !isSelf) return null;

  const isAdminMessage = !isSelf && message.senderRole &&
    ["admin", "staff_support", "staff_dispute", "staff_moderation"].includes(message.senderRole);

  return (
    <div className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}>
      {isAdminMessage && (
        <span className="text-[10px] font-semibold text-violet-600 mb-0.5 px-1">
          Admin · {message.senderName ?? "Staff"}
        </span>
      )}
      <div className={cn("flex", isSelf ? "justify-end" : "justify-start", "w-full")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isSelf
            ? "bg-[#0EA5E9] text-white rounded-br-sm"
            : isAdminMessage
              ? "bg-violet-50 border border-violet-200 text-foreground rounded-bl-sm"
              : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {message.content && <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>}

        {message.fileUrl && message.fileName && (
          <a
            href={getPublicUrl(message.fileUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 mt-1.5 text-xs underline underline-offset-2",
              isSelf ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Download className="w-3 h-3 shrink-0" />
            {message.fileName}
          </a>
        )}

        <p
          className={cn(
            "text-[10px] mt-1 text-right",
            isSelf ? "text-white/60" : "text-muted-foreground"
          )}
        >
          {formatDateTime(message.createdAt)}
        </p>
      </div>
      </div>
    </div>
  );
}
