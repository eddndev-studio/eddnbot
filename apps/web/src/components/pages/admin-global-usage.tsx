import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminGlobalUsage } from "@/hooks/use-admin-stats";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function AdminGlobalUsage() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading } = useAdminGlobalUsage(month);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-neutral-500">Month</Label>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44 border-neutral-700 bg-neutral-800 text-neutral-100"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-neutral-500" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-neutral-800 bg-neutral-900/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">AI Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-100">
                  {data.totals.aiTokens.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-neutral-800 bg-neutral-900/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">
                  WhatsApp Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-100">
                  {data.totals.whatsappMessages.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-neutral-800 bg-neutral-900/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-neutral-400">API Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-neutral-100">
                  {data.totals.apiRequests.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-neutral-800 bg-neutral-900/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-400">By Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-left text-neutral-500">
                      <th className="pb-2 font-medium">Tenant</th>
                      <th className="pb-2 font-medium">AI Tokens</th>
                      <th className="pb-2 font-medium">WA Messages</th>
                      <th className="pb-2 font-medium">API Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tenants.map((t) => (
                      <tr key={t.tenantId} className="border-b border-neutral-800/50">
                        <td className="py-2">
                          <Link
                            to="/admin/tenants/$tenantId"
                            params={{ tenantId: t.tenantId }}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            {t.name}
                          </Link>
                          <span className="ml-1 text-xs text-neutral-500">({t.slug})</span>
                        </td>
                        <td className="py-2 text-neutral-300">
                          {t.aiTokens.total.toLocaleString()}
                        </td>
                        <td className="py-2 text-neutral-300">
                          {t.whatsappMessages.toLocaleString()}
                        </td>
                        <td className="py-2 text-neutral-300">
                          {t.apiRequests.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {data.tenants.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-neutral-500">
                          No usage data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
