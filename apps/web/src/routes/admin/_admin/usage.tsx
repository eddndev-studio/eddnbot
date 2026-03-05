import { createFileRoute } from "@tanstack/react-router";
import { AdminGlobalUsage } from "@/components/pages/admin-global-usage";

export const Route = createFileRoute("/admin/_admin/usage")({
  component: AdminGlobalUsage,
});
