import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAdminTenant, useUpdateTenant, useDeleteTenant } from "@/hooks/use-admin-tenants";
import {
  useAdminTenantAiConfigs,
  useAdminTenantWhatsAppAccounts,
  useAdminTenantQuotas,
  useAdminUpsertQuotas,
  useAdminTenantUsage,
} from "@/hooks/use-admin-tenant-details";
import { AdminApiKeys } from "./admin-api-keys";

export function AdminTenantDetail({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const { data: tenant, isLoading } = useAdminTenant(tenantId);
  const { data: aiConfigsData } = useAdminTenantAiConfigs(tenantId);
  const { data: waData } = useAdminTenantWhatsAppAccounts(tenantId);
  const { data: quotasData } = useAdminTenantQuotas(tenantId);
  const { data: usageData } = useAdminTenantUsage(tenantId);
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const upsertQuotas = useAdminUpsertQuotas(tenantId);

  const [editName, setEditName] = useState<string | null>(null);
  const [quotaTokens, setQuotaTokens] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!tenant) {
    return <p className="text-neutral-500">Tenant not found</p>;
  }

  async function handleToggleActive() {
    if (!tenant) return;
    await updateTenant.mutateAsync({ id: tenantId, data: { isActive: !tenant.isActive } });
  }

  async function handleSaveName() {
    if (editName === null) return;
    await updateTenant.mutateAsync({ id: tenantId, data: { name: editName } });
    setEditName(null);
  }

  async function handleDelete() {
    if (!confirm("Delete this tenant? This cannot be undone.")) return;
    await deleteTenant.mutateAsync(tenantId);
    navigate({ to: "/admin/tenants" });
  }

  async function handleSaveQuotas(e: React.FormEvent) {
    e.preventDefault();
    const val = quotaTokens ? Number(quotaTokens) : null;
    await upsertQuotas.mutateAsync({ maxAiTokensPerMonth: val });
    setQuotaTokens("");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tenant Info */}
      <Card className="border-neutral-800 bg-neutral-900/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-neutral-100">Tenant Info</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={tenant.isActive}
                onCheckedChange={handleToggleActive}
              />
              <Badge
                className={
                  tenant.isActive
                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10"
                    : "bg-neutral-700 text-neutral-400 hover:bg-neutral-700"
                }
              >
                {tenant.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="mr-1 size-3" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-neutral-500">Name</Label>
              {editName !== null ? (
                <div className="mt-1 flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border-neutral-700 bg-neutral-800 text-neutral-100"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
                  >
                    <Save className="size-3" />
                  </Button>
                </div>
              ) : (
                <p
                  className="mt-1 cursor-pointer text-neutral-100 hover:text-amber-400"
                  onClick={() => setEditName(tenant.name)}
                >
                  {tenant.name}
                </p>
              )}
            </div>
            <div>
              <Label className="text-neutral-500">Slug</Label>
              <p className="mt-1 font-mono text-sm text-neutral-300">{tenant.slug}</p>
            </div>
            <div>
              <Label className="text-neutral-500">ID</Label>
              <p className="mt-1 font-mono text-xs text-neutral-400">{tenant.id}</p>
            </div>
            <div>
              <Label className="text-neutral-500">Created</Label>
              <p className="mt-1 text-neutral-300">
                {new Date(tenant.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="border-neutral-800 bg-neutral-900/60">
        <CardContent className="pt-6">
          <AdminApiKeys tenantId={tenantId} />
        </CardContent>
      </Card>

      {/* AI Configs */}
      <Card className="border-neutral-800 bg-neutral-900/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300">AI Configs</CardTitle>
        </CardHeader>
        <CardContent>
          {aiConfigsData?.aiConfigs.length === 0 ? (
            <p className="text-sm text-neutral-500">No AI configs</p>
          ) : (
            <div className="space-y-2">
              {aiConfigsData?.aiConfigs.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-800/30 px-3 py-2">
                  <div>
                    <span className="text-sm text-neutral-100">{c.label}</span>
                    <span className="ml-2 text-xs text-neutral-500">{c.provider} / {c.model}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Accounts */}
      <Card className="border-neutral-800 bg-neutral-900/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300">WhatsApp Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {waData?.whatsappAccounts.length === 0 ? (
            <p className="text-sm text-neutral-500">No WhatsApp accounts</p>
          ) : (
            <div className="space-y-2">
              {waData?.whatsappAccounts.map((wa) => (
                <div key={wa.id} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-800/30 px-3 py-2">
                  <div>
                    <span className="text-sm text-neutral-100">
                      {wa.displayPhoneNumber ?? wa.phoneNumberId}
                    </span>
                    <Badge
                      className={`ml-2 ${wa.isActive ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10" : "bg-neutral-700 text-neutral-400 hover:bg-neutral-700"}`}
                    >
                      {wa.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {wa.autoReplyEnabled && (
                      <Badge className="ml-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10">
                        Auto-reply
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotas */}
      <Card className="border-neutral-800 bg-neutral-900/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300">Quotas</CardTitle>
        </CardHeader>
        <CardContent>
          {quotasData?.quotas ? (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-neutral-500">AI Tokens/month:</span>{" "}
                <span className="text-neutral-100">
                  {quotasData.quotas.maxAiTokensPerMonth?.toLocaleString() ?? "Unlimited"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">WA Messages/month:</span>{" "}
                <span className="text-neutral-100">
                  {quotasData.quotas.maxWhatsappMessagesPerMonth?.toLocaleString() ?? "Unlimited"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">API Requests/month:</span>{" "}
                <span className="text-neutral-100">
                  {quotasData.quotas.maxApiRequestsPerMonth?.toLocaleString() ?? "Unlimited"}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Rate limit/min:</span>{" "}
                <span className="text-neutral-100">{quotasData.quotas.maxRequestsPerMinute}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No quotas set (unlimited)</p>
          )}
          <form onSubmit={handleSaveQuotas} className="mt-4 flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-neutral-500">Max AI Tokens/month</Label>
              <Input
                type="number"
                value={quotaTokens}
                onChange={(e) => setQuotaTokens(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-44 border-neutral-700 bg-neutral-800 text-sm text-neutral-100"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={upsertQuotas.isPending}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Usage */}
      {usageData && (
        <Card className="border-neutral-800 bg-neutral-900/60">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-neutral-300">
              Usage ({usageData.month})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-neutral-500">AI Tokens</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {(usageData.aiTokens?.total ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">WA Messages</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {(usageData.whatsappMessages ?? 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">API Requests</p>
                <p className="text-lg font-semibold text-neutral-100">
                  {(usageData.apiRequests ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
