import { createFileRoute } from "@tanstack/react-router";
import { ConversationDetail } from "@/components/pages/conversation-detail";

export const Route = createFileRoute("/_auth/conversations/$conversationId")({
  component: () => {
    const { conversationId } = Route.useParams();
    return <ConversationDetail conversationId={conversationId} />;
  },
});
