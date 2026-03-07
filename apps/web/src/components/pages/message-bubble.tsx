import { useState } from "react";
import { Check, CheckCheck, FileDown, Loader2 } from "lucide-react";
import type { Message } from "@/types/conversation";
import { formatMessageTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import { useMediaUrl } from "@/hooks/use-media-url";

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

// --- Media content extractors ---

function getMediaId(content: Record<string, unknown>, field: string): string | undefined {
  const media = content[field] as { id?: string } | undefined;
  return media?.id;
}

function getCaption(content: Record<string, unknown>, field: string): string | null {
  const media = content[field] as { caption?: string } | undefined;
  return media?.caption ?? null;
}

function getDocFilename(content: Record<string, unknown>): string | null {
  const doc = content.document as { filename?: string } | undefined;
  return doc?.filename ?? null;
}

function getTextBody(content: Record<string, unknown>): string | null {
  const text = content.text as { body?: string } | undefined;
  return text?.body ?? null;
}

// --- Media components ---

function MediaLoading() {
  return (
    <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-neutral-700/40">
      <Loader2 className="size-5 animate-spin text-neutral-400" />
    </div>
  );
}

function ImageContent({ content }: { content: Record<string, unknown> }) {
  const mediaId = getMediaId(content, "image");
  const caption = getCaption(content, "image");
  const { url, isLoading } = useMediaUrl(mediaId);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      {isLoading ? (
        <MediaLoading />
      ) : url ? (
        <>
          <img
            src={url}
            alt={caption ?? "Image"}
            className="max-h-64 max-w-full cursor-pointer rounded-lg object-contain"
            onClick={() => setExpanded(true)}
          />
          {expanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8"
              onClick={() => setExpanded(false)}
            >
              <img
                src={url}
                alt={caption ?? "Image"}
                className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              />
            </div>
          )}
        </>
      ) : (
        <p className="italic text-neutral-400">[Image]</p>
      )}
      {caption && <p className="whitespace-pre-wrap break-words">{caption}</p>}
    </div>
  );
}

function StickerContent({ content }: { content: Record<string, unknown> }) {
  const mediaId = getMediaId(content, "sticker");
  const { url, isLoading } = useMediaUrl(mediaId);

  if (isLoading) return <MediaLoading />;
  if (!url) return <p className="italic text-neutral-400">[Sticker]</p>;

  return <img src={url} alt="Sticker" className="size-32 object-contain" />;
}

function AudioContent({ content }: { content: Record<string, unknown> }) {
  const mediaId = getMediaId(content, "audio");
  const { url, isLoading } = useMediaUrl(mediaId);

  if (isLoading) return <MediaLoading />;
  if (!url) return <p className="italic text-neutral-400">[Audio]</p>;

  return (
    <audio controls preload="metadata" className="max-w-[280px]">
      <source src={url} />
    </audio>
  );
}

function VideoContent({ content }: { content: Record<string, unknown> }) {
  const mediaId = getMediaId(content, "video");
  const caption = getCaption(content, "video");
  const { url, isLoading } = useMediaUrl(mediaId);

  return (
    <div className="space-y-1">
      {isLoading ? (
        <MediaLoading />
      ) : url ? (
        <video
          controls
          preload="metadata"
          className="max-h-64 max-w-full rounded-lg"
        >
          <source src={url} />
        </video>
      ) : (
        <p className="italic text-neutral-400">[Video]</p>
      )}
      {caption && <p className="whitespace-pre-wrap break-words">{caption}</p>}
    </div>
  );
}

function DocumentContent({ content }: { content: Record<string, unknown> }) {
  const mediaId = getMediaId(content, "document");
  const filename = getDocFilename(content);
  const caption = getCaption(content, "document");
  const { url } = useMediaUrl(mediaId);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 rounded-lg bg-neutral-700/30 px-3 py-2">
        <FileDown className="size-5 shrink-0 text-neutral-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {filename ?? "Document"}
          </p>
        </div>
        {url && (
          <a
            href={url}
            download={filename ?? "document"}
            className="shrink-0 text-xs text-blue-400 hover:underline"
          >
            Download
          </a>
        )}
      </div>
      {caption && <p className="whitespace-pre-wrap break-words">{caption}</p>}
    </div>
  );
}

// --- Main content router ---

function MessageContent({ message }: { message: Message }) {
  const { content } = message;

  switch (message.type) {
    case "text": {
      const body = getTextBody(content);
      return <p className="whitespace-pre-wrap break-words">{body ?? ""}</p>;
    }
    case "image":
      return <ImageContent content={content} />;
    case "sticker":
      return <StickerContent content={content} />;
    case "audio":
      return <AudioContent content={content} />;
    case "video":
      return <VideoContent content={content} />;
    case "document":
      return <DocumentContent content={content} />;
    case "location":
      return <p className="italic text-neutral-400">[Location]</p>;
    case "contacts":
      return <p className="italic text-neutral-400">[Contact]</p>;
    case "reaction": {
      const emoji = (content.reaction as { emoji?: string })?.emoji;
      return <p>{emoji ?? ""}</p>;
    }
    case "template": {
      const tpl = content.template as { name?: string } | undefined;
      return (
        <p className="italic text-neutral-400">
          [Template: {tpl?.name ?? "unknown"}]
        </p>
      );
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
          <span
            className={cn(
              "text-[10px]",
              isOutbound ? "text-blue-200/60" : "text-neutral-500",
            )}
          >
            {formatMessageTime(message.createdAt)}
          </span>
          <StatusIcon message={message} />
        </div>
      </div>
    </div>
  );
}
