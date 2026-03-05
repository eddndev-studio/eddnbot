import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { Header } from "./header";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-950">
      <aside className="hidden w-60 shrink-0 border-r border-neutral-800 bg-neutral-950 md:block">
        <SidebarNav />
      </aside>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
