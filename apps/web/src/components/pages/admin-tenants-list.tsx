import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminTenants } from "@/hooks/use-admin-tenants";

export function AdminTenantsList() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminTenants(search || undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-neutral-700 bg-neutral-800 pl-9 text-neutral-100 placeholder:text-neutral-600"
          />
        </div>
        <Link to="/admin/tenants/new">
          <Button size="sm" className="bg-amber-500 text-neutral-950 hover:bg-amber-400">
            <Plus className="mr-2 size-4" />
            New Tenant
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-neutral-500" />
        </div>
      ) : (
        <Card className="border-neutral-800 bg-neutral-900/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-left text-neutral-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {data?.tenants.map((t) => (
                    <tr key={t.id} className="border-b border-neutral-800/50">
                      <td className="px-4 py-3 font-medium text-neutral-100">{t.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-neutral-400">{t.slug}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={t.isActive ? "default" : "secondary"}
                          className={
                            t.isActive
                              ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10"
                              : "bg-neutral-700 text-neutral-400 hover:bg-neutral-700"
                          }
                        >
                          {t.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/admin/tenants/$tenantId"
                          params={{ tenantId: t.id }}
                          className="text-sm text-amber-400 hover:text-amber-300"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {data?.tenants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                        No tenants found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
