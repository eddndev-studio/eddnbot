import { Users, MessageCircle, Brain, Key, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats, useAdminGlobalUsage } from "@/hooks/use-admin-stats";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-neutral-800 bg-neutral-900/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-neutral-400">{label}</CardTitle>
        <Icon className="size-4 text-neutral-500" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-neutral-100">
          {value !== undefined ? value.toLocaleString() : "-"}
        </p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: usage, isLoading: usageLoading } = useAdminGlobalUsage();

  if (statsLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tenants" value={stats?.tenants} icon={Users} />
        <StatCard label="WhatsApp Accounts" value={stats?.whatsappAccounts} icon={MessageCircle} />
        <StatCard label="AI Configs" value={stats?.aiConfigs} icon={Brain} />
        <StatCard label="API Keys" value={stats?.apiKeys} icon={Key} />
      </div>

      {usage && (
        <Card className="border-neutral-800 bg-neutral-900/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-400">
              Usage this month ({usage.month})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-neutral-500">AI Tokens</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {usage.totals.aiTokens.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">WhatsApp Messages</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {usage.totals.whatsappMessages.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">API Requests</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {usage.totals.apiRequests.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {usage && usage.tenants.length > 0 && (
        <Card className="border-neutral-800 bg-neutral-900/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-400">Usage by Tenant</CardTitle>
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
                  {usage.tenants.map((t) => (
                    <tr key={t.tenantId} className="border-b border-neutral-800/50">
                      <td className="py-2 text-neutral-100">
                        {t.name}{" "}
                        <span className="text-xs text-neutral-500">({t.slug})</span>
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
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
