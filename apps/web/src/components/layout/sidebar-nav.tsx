import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Brain,
  MessageCircle,
  Gauge,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-configs", label: "AI Configs", icon: Brain },
  { to: "/whatsapp-accounts", label: "WhatsApp", icon: MessageCircle },
  { to: "/quotas", label: "Quotas", icon: Gauge },
  { to: "/usage", label: "Usage", icon: BarChart3 },
] as const;

export function SidebarNav() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      <div className="mb-6 px-3">
        <h1 className="text-lg font-bold tracking-tight text-neutral-100">eddnbot</h1>
        <p className="text-xs text-neutral-500">Dashboard</p>
      </div>
      {items.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-l-2 border-neutral-100 bg-neutral-800/50 text-neutral-100"
                : "text-neutral-400 hover:bg-neutral-800/30 hover:text-neutral-200",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
