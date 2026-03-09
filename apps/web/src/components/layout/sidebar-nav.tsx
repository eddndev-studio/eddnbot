import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Brain,
  MessageCircle,
  MessagesSquare,
  BarChart3,
  ArrowLeftRight,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveTenant, getAccount, isAuthenticated } from "@/lib/api-client";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai-configs", label: "AI Configs", icon: Brain },
  { to: "/whatsapp-accounts", label: "WhatsApp", icon: MessageCircle },
  { to: "/conversations", label: "Conversations", icon: MessagesSquare },
  { to: "/usage", label: "Usage", icon: BarChart3 },
  { to: "/members", label: "Members", icon: Users },
] as const;

export function SidebarNav() {
  const navigate = useNavigate();
  const router = useRouterState();
  const pathname = router.location.pathname;
  const tenant = getActiveTenant();
  const account = getAccount();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      <div className="mb-2 px-3">
        <h1 className="text-lg font-bold tracking-tight text-neutral-100">eddnbot</h1>
        {tenant && (
          <p className="truncate text-xs text-neutral-500">{tenant.tenantName}</p>
        )}
      </div>
      {isAuthenticated() && account && (
        <button
          onClick={() => navigate({ to: "/select-tenant" })}
          className="mb-4 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-800/30 hover:text-neutral-300"
        >
          <ArrowLeftRight className="size-3" />
          Switch workspace
        </button>
      )}
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
