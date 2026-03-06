import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessagesSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversations } from "@/hooks/use-conversations";
import { ConversationFilters, type ConversationFiltersState } from "./conversation-filters";
import { formatRelativeTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

function ContactAvatar({ name, phone }: { name: string | null; phone: string }) {
  const initial = (name ?? phone).charAt(0).toUpperCase();
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-medium text-neutral-300">
      {initial}
    </div>
  );
}

export function ConversationsList() {
  const [filters, setFilters] = useState<ConversationFiltersState>({});
  const [page, setPage] = useState(1);

  const { data, isLoading } = useConversations({ ...filters, page, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-lg bg-neutral-800" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg bg-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  const conversations = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-100">Conversations</h1>
        {pagination && (
          <span className="text-sm text-neutral-500">
            {pagination.total} conversation{pagination.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ConversationFilters
        filters={filters}
        onFiltersChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 py-16">
          <MessagesSquare className="mb-3 size-10 text-neutral-600" />
          <p className="text-neutral-500">No conversations yet</p>
          <p className="mt-1 text-xs text-neutral-600">
            Conversations will appear here when contacts message your WhatsApp number
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => {
            const lastMsgText =
              conv.lastMessage?.type === "text"
                ? (conv.lastMessage.content.body as string)
                : conv.lastMessage
                  ? `[${conv.lastMessage.type}]`
                  : null;

            return (
              <Link
                key={conv.id}
                to="/conversations/$conversationId"
                params={{ conversationId: conv.id }}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 transition-colors hover:border-neutral-700 hover:bg-neutral-800/50"
              >
                <ContactAvatar name={conv.contactName} phone={conv.contactPhone} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-neutral-100">
                      {conv.contactName || conv.contactPhone}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {conv.unreadCount > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                      {conv.lastMessage && (
                        <span className="text-xs text-neutral-500">
                          {formatRelativeTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="truncate text-sm text-neutral-500">
                      {lastMsgText
                        ? lastMsgText.length > 60
                          ? `${lastMsgText.slice(0, 60)}...`
                          : lastMsgText
                        : "No messages"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          conv.status === "active"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border-neutral-700 text-neutral-500",
                        )}
                      >
                        {conv.status}
                      </Badge>
                    </div>
                  </div>

                  {conv.contactName && (
                    <p className="mt-0.5 text-xs text-neutral-600">{conv.contactPhone}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="border-neutral-800 bg-neutral-900/60"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-neutral-400">
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(page + 1)}
            className="border-neutral-800 bg-neutral-900/60"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
