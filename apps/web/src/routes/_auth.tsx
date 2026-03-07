import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { isAuthenticated, hasTenantSelected, hasApiKey } from "@/lib/api-client";

export const Route = createFileRoute("/_auth")({
  beforeLoad: () => {
    // Support both new auth and legacy API key
    if (!isAuthenticated() && !hasApiKey()) {
      throw redirect({ to: "/login" });
    }
    // If authenticated but no tenant selected, go to tenant selector
    if (isAuthenticated() && !hasTenantSelected()) {
      throw redirect({ to: "/select-tenant" });
    }
  },
  component: () => (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
});
