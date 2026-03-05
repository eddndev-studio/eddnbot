import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layout/admin-layout";
import { hasAdminToken } from "@/lib/admin-client";

export const Route = createFileRoute("/admin/_admin")({
  beforeLoad: () => {
    if (!hasAdminToken()) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  ),
});
