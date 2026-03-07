import { createFileRoute } from "@tanstack/react-router";
import { WhatsAppTemplatesList } from "@/components/pages/whatsapp-templates-list";

export const Route = createFileRoute(
  "/_auth/whatsapp-accounts/$accountId/templates/",
)({
  component: () => {
    const { accountId } = Route.useParams();
    return <WhatsAppTemplatesList accountId={accountId} />;
  },
});
