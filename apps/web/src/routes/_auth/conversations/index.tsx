import { createFileRoute } from "@tanstack/react-router";
import { ConversationsList } from "@/components/pages/conversations-list";

export const Route = createFileRoute("/_auth/conversations/")({
  component: ConversationsList,
});
