import { createFileRoute } from "@tanstack/react-router";
import { QuotasPage } from "@/components/pages/quotas-page";

export const Route = createFileRoute("/_auth/quotas")({
  component: QuotasPage,
});
