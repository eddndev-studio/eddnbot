import { createFileRoute } from "@tanstack/react-router";
import { WhatsAppAccountForm } from "@/components/pages/whatsapp-account-form";

export const Route = createFileRoute("/_auth/whatsapp-accounts/new")({
  component: () => <WhatsAppAccountForm mode="create" />,
});
