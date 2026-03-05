import { createFileRoute } from "@tanstack/react-router";
import { AdminTenantForm } from "@/components/pages/admin-tenant-form";

export const Route = createFileRoute("/admin/_admin/tenants/new")({
  component: AdminTenantForm,
});
