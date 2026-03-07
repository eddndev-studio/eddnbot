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

function getTextBody(content: Record<string, unknown>): string | null {
  const text = content.text as { body?: string } | undefined;
  return text?.body ?? null;
}

function getCaption(content: Record<string, unknown>, key: string): string | null {
  const media = content[key] as { caption?: string } | undefined;
  return media?.caption ?? null;
}

function getTemplateName(content: Record<string, unknown>): string | null {
  const tpl = content.template as { name?: string } | undefined;
  return tpl?.name ?? null;
}

function MessageContent({ message }: { message: Message }) {
  const { content } = message;

  switch (message.type) {
    case "text": {
      const body = getTextBody(content);
      return <p className="whitespace-pre-wrap break-words">{body ?? ""}</p>;
    }
    case "image": {
      const caption = getCaption(content, "image");
      return caption
        ? <p className="whitespace-pre-wrap break-words"><span className="italic text-neutral-400">[Image] </span>{caption}</p>
        : <p className="italic text-neutral-400">[Image]</p>;
    }
    case "video": {
      const caption = getCaption(content, "video");
      return caption
        ? <p className="whitespace-pre-wrap break-words"><span className="italic text-neutral-400">[Video] </span>{caption}</p>
        : <p className="italic text-neutral-400">[Video]</p>;
    }
    case "document": {
      const doc = content.document as { filename?: string; caption?: string } | undefined;
      const label = doc?.filename ?? doc?.caption ?? null;
      return label
        ? <p className="whitespace-pre-wrap break-words"><span className="italic text-neutral-400">[Document] </span>{label}</p>
        : <p className="italic text-neutral-400">[Document]</p>;
    }
    case "audio":
      return <p className="italic text-neutral-400">[Audio]</p>;
    case "sticker":
      return <p className="italic text-neutral-400">[Sticker]</p>;
    case "location":
      return <p className="italic text-neutral-400">[Location]</p>;
    case "contacts":
      return <p className="italic text-neutral-400">[Contact]</p>;
    case "reaction": {
      const emoji = (content.reaction as { emoji?: string })?.emoji;
      return <p>{emoji ?? "👍"}</p>;
    }
    case "template": {
      const name = getTemplateName(content);
      return <p className="italic text-neutral-400">[Template: {name ?? "unknown"}]</p>;
    }
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
