import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAdminToken } from "@/lib/admin-client";
import { queryClient } from "@/lib/query-client";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/tenants": "Tenants",
  "/admin/tenants/new": "New Tenant",
  "/admin/usage": "Global Usage",
};

export function AdminHeader() {
  const navigate = useNavigate();
  const router = useRouterState();
  const pathname = router.location.pathname;

  const title =
    titles[pathname] ??
    (pathname.match(/^\/admin\/tenants\/[^/]+$/) ? "Tenant Detail" : "Admin");

  function handleLogout() {
    clearAdminToken();
    queryClient.clear();
    navigate({ to: "/admin/login" });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-800 px-6">
      <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
      <Button variant="ghost" size="sm" onClick={handleLogout} className="text-neutral-400">
        <LogOut className="mr-2 size-4" />
        Logout
      </Button>
    </header>
  );
}
