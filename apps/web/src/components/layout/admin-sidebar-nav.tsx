import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, BarChart3, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/tenants", label: "Tenants", icon: Users },
  { to: "/admin/usage", label: "Usage", icon: BarChart3 },
] as const;

export function AdminSidebarNav() {
  const router = useRouterState();
  const pathname = router.location.pathname;

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      <div className="mb-6 px-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-amber-400" />
          <h1 className="text-lg font-bold tracking-tight text-neutral-100">eddnbot</h1>
        </div>
        <p className="text-xs text-amber-400/70">Admin Panel</p>
      </div>
      {items.map(({ to, label, icon: Icon }) => {
        const active =
          to === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-l-2 border-amber-400 bg-neutral-800/50 text-neutral-100"
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
