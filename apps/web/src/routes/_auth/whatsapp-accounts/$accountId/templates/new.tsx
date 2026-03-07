import { createFileRoute } from "@tanstack/react-router";
import { WhatsAppTemplateForm } from "@/components/pages/whatsapp-template-form";

export const Route = createFileRoute(
  "/_auth/whatsapp-accounts/$accountId/templates/new",
)({
  component: () => {
    const { accountId } = Route.useParams();
    return <WhatsAppTemplateForm accountId={accountId} />;
  },
});
