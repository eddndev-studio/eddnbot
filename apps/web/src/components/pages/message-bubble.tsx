import { Check, CheckCheck } from "lucide-react";
import type { Message } from "@/types/conversation";
import { formatMessageTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
}

function StatusIcon({ message }: { message: Message }) {
  if (message.direction !== "outbound") return null;

  if (message.readAt) {
    return <CheckCheck className="size-3.5 text-blue-400" />;
  }
  if (message.deliveredAt) {
    return <CheckCheck className="size-3.5 text-neutral-400" />;
  }
  return <Check className="size-3.5 text-neutral-400" />;
}

function MessageContent({ message }: { message: Message }) {
  switch (message.type) {
    case "text":
      return <p className="whitespace-pre-wrap break-words">{message.content.body as string}</p>;
    case "audio":
      return <p className="italic text-neutral-400">[Audio]</p>;
    case "image":
      return <p className="italic text-neutral-400">[Image]</p>;
    case "video":
      return <p className="italic text-neutral-400">[Video]</p>;
    case "document":
      return <p className="italic text-neutral-400">[Document]</p>;
    case "sticker":
      return <p className="italic text-neutral-400">[Sticker]</p>;
    case "location":
      return <p className="italic text-neutral-400">[Location]</p>;
    case "contacts":
      return <p className="italic text-neutral-400">[Contact]</p>;
    default:
      return <p className="italic text-neutral-400">[{message.type}]</p>;
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-xl px-3 py-2 text-sm",
          isOutbound
            ? "bg-blue-600/80 text-white"
            : "bg-neutral-800 text-neutral-200",
        )}
      >
        <MessageContent message={message} />
        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          <span className={cn("text-[10px]", isOutbound ? "text-blue-200/60" : "text-neutral-500")}>
            {formatMessageTime(message.createdAt)}
          </span>
          <StatusIcon message={message} />
        </div>
      </div>
    </div>
  );
}
