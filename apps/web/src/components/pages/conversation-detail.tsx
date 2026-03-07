import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversation, useConversationMessages } from "@/hooks/use-conversations";
import { MessageBubble } from "./message-bubble";
import { formatDateSeparator } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/conversation";

interface ConversationDetailProps {
  conversationId: string;
}

function groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  for (const msg of messages) {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }

  return groups;
}

export function ConversationDetail({ conversationId }: ConversationDetailProps) {
  const { data: conversation, isLoading: convLoading } = useConversation(conversationId);
  const [page, setPage] = useState(1);
  const { data: messagesData, isLoading: msgsLoading } = useConversationMessages(conversationId, page);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  useEffect(() => {
    if (!messagesData || !scrollRef.current) return;
    const count = messagesData.data.length;
    // Scroll to bottom on first load or when new messages arrive
    if (prevMessageCount.current === 0 || count > prevMessageCount.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
    prevMessageCount.current = count;
  }, [messagesData]);

  if (convLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-lg bg-neutral-800" />
        <Skeleton className="h-[500px] rounded-lg bg-neutral-800" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-neutral-500">Conversation not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4 border-neutral-800">
          <Link to="/conversations">Back to conversations</Link>
        </Button>
      </div>
    );
  }

  const messages = messagesData?.data ?? [];
  const pagination = messagesData?.pagination;
  const dateGroups = groupMessagesByDate(messages);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-t-lg border border-neutral-800 bg-neutral-900/80 px-4 py-3">
        <Button asChild variant="ghost" size="sm" className="shrink-0">
          <Link to="/conversations">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-neutral-100">
              {conversation.contactName || conversation.contactPhone}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0",
                conversation.status === "active"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-neutral-700 text-neutral-500",
              )}
            >
              {conversation.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {conversation.contactName && <span>{conversation.contactPhone}</span>}
            <span>
              via {conversation.account.displayPhoneNumber || conversation.account.phoneNumberId}
            </span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto border-x border-neutral-800 bg-neutral-950/50 px-4 py-4"
      >
        {pagination && pagination.totalPages > page && (
          <div className="mb-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              className="border-neutral-800 bg-neutral-900/60 text-neutral-400"
            >
              <ChevronUp className="mr-1 size-3" />
              Load older messages
            </Button>
          </div>
        )}

        {msgsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "h-12 w-[60%] rounded-xl bg-neutral-800",
                  i % 2 === 0 ? "" : "ml-auto",
                )}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-600">No messages in this conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((group) => (
              <div key={group.date}>
                <div className="mb-3 flex justify-center">
                  <span className="rounded-full bg-neutral-800/80 px-3 py-1 text-xs text-neutral-400">
                    {formatDateSeparator(group.date)}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - read only notice */}
      <div className="rounded-b-lg border border-neutral-800 bg-neutral-900/60 px-4 py-3">
        <p className="text-center text-xs text-neutral-600">
          Read-only view — replies are not supported yet
        </p>
      </div>
    </div>
  );
}
