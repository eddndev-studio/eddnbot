import { createFileRoute } from "@tanstack/react-router";
import { AdminTenantDetail } from "@/components/pages/admin-tenant-detail";

export const Route = createFileRoute("/admin/_admin/tenants/$tenantId")({
  component: () => {
    const { tenantId } = Route.useParams();
    return <AdminTenantDetail tenantId={tenantId} />;
  },
});
