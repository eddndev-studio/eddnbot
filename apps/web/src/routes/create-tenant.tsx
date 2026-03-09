import { createFileRoute, redirect } from "@tanstack/react-router";
import { CreateTenantPage } from "@/components/pages/create-tenant-page";
import { isAuthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/create-tenant")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: CreateTenantPage,
});
