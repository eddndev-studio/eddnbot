import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { hasApiKey } from "@/lib/api-client";

export const Route = createFileRoute("/_auth")({
  beforeLoad: () => {
    if (!hasApiKey()) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  ),
});
