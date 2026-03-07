import { createFileRoute, redirect } from "@tanstack/react-router";
import { SelectTenantPage } from "@/components/pages/select-tenant-page";
import { isAuthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/select-tenant")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: SelectTenantPage,
});
