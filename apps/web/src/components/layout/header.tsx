import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearSession, clearApiKey, getAccount, getActiveTenant } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";
import { api } from "@/lib/api-client";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/ai-configs": "AI Configs",
  "/ai-configs/new": "New AI Config",
  "/whatsapp-accounts": "WhatsApp Accounts",
  "/whatsapp-accounts/new": "New Account",
  "/quotas": "Quotas",
  "/usage": "Usage",
  "/members": "Members",
};

export function Header() {
  const navigate = useNavigate();
  const router = useRouterState();
  const pathname = router.location.pathname;
  const account = getAccount();
  const tenant = getActiveTenant();

  const title =
    titles[pathname] ??
    (pathname.startsWith("/ai-configs/") ? "Edit AI Config" : undefined) ??
    (pathname.startsWith("/whatsapp-accounts/") ? "Edit Account" : undefined) ??
    "Dashboard";

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore — we're logging out anyway
    }
    clearSession();
    clearApiKey();
    queryClient.clear();
    navigate({ to: "/login" });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-neutral-800 px-6">
      <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="flex items-center gap-4">
        {account && (
          <div className="text-right">
            <p className="text-xs text-neutral-400">{account.email}</p>
            {tenant && <p className="text-xs text-neutral-500">{tenant.tenantName}</p>}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-neutral-400">
          <LogOut className="mr-2 size-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
