import { createFileRoute } from "@tanstack/react-router";
import { WhatsAppAccountsList } from "@/components/pages/whatsapp-accounts-list";

export const Route = createFileRoute("/_auth/whatsapp-accounts/")({
  component: WhatsAppAccountsList,
});
