import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginPage } from "@/components/pages/admin-login-page";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});
