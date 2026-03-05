import { createFileRoute } from "@tanstack/react-router";
import { DashboardHome } from "@/components/pages/dashboard-home";

export const Route = createFileRoute("/_auth/")({
  component: DashboardHome,
});
