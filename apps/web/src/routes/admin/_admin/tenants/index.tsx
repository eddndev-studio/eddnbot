import { createFileRoute } from "@tanstack/react-router";
import { AdminTenantsList } from "@/components/pages/admin-tenants-list";

export const Route = createFileRoute("/admin/_admin/tenants/")({
  component: AdminTenantsList,
});
