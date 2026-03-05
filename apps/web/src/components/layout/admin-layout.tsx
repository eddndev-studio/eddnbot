import type { ReactNode } from "react";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { AdminHeader } from "./admin-header";

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-950">
      <aside className="hidden w-60 shrink-0 border-r border-neutral-800 bg-neutral-950 md:block">
        <AdminSidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
