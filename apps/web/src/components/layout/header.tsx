import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearApiKey } from "@/lib/api-client";
import { queryClient } from "@/lib/query-client";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/ai-configs": "AI Configs",
  "/ai-configs/new": "New AI Config",
  "/whatsapp-accounts": "WhatsApp Accounts",
  "/whatsapp-accounts/new": "New Account",
  "/quotas": "Quotas",
  "/usage": "Usage",
};

export function Header() {
  const navigate = useNavigate();
  const router = useRouterState();
  const pathname = router.location.pathname;

  const title =
    titles[pathname] ??
    (pathname.startsWith("/ai-configs/") ? "Edit AI Config" : undefined) ??
    (pathname.startsWith("/whatsapp-accounts/") ? "Edit Account" : undefined) ??
    "Dashboard";

  function handleLogout() {
    clearApiKey();
    queryClient.clear();
    navigate({ to: "/login" });
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
