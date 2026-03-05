import { useState } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminApiKeys, useCreateAdminApiKey, useRevokeAdminApiKey } from "@/hooks/use-admin-api-keys";

export function AdminApiKeys({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useAdminApiKeys(tenantId);
  const createKey = useCreateAdminApiKey();
  const revokeKey = useRevokeAdminApiKey();
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    const result = await createKey.mutateAsync({ tenantId, data: {} });
    setNewRawKey(result.rawKey);
  }

  async function handleCopy() {
    if (!newRawKey) return;
    await navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRevoke(keyId: string) {
    await revokeKey.mutateAsync({ tenantId, keyId });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300">API Keys</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={createKey.isPending}
          className="border-neutral-700 text-neutral-300"
        >
          <Plus className="mr-1 size-3" />
          Generate Key
        </Button>
      </div>

      {newRawKey && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="mb-1 text-xs text-amber-400">
            Copy this key now. It won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-neutral-800 px-2 py-1 font-mono text-xs text-neutral-100">
              {newRawKey}
            </code>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="text-amber-400">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading...</p>
      ) : (
        <div className="space-y-2">
          {data?.apiKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-800/30 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <code className="font-mono text-xs text-neutral-300">{k.keyPrefix}...</code>
                {k.revokedAt ? (
                  <Badge className="bg-red-500/10 text-red-400 hover:bg-red-500/10">Revoked</Badge>
                ) : k.expiresAt && new Date(k.expiresAt) < new Date() ? (
                  <Badge className="bg-neutral-700 text-neutral-400 hover:bg-neutral-700">Expired</Badge>
                ) : (
                  <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">Active</Badge>
                )}
                <span className="text-xs text-neutral-500">
                  {new Date(k.createdAt).toLocaleDateString()}
                </span>
              </div>
              {!k.revokedAt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevoke(k.id)}
                  disabled={revokeKey.isPending}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
          ))}
          {data?.apiKeys.length === 0 && (
            <p className="py-4 text-center text-sm text-neutral-500">No API keys</p>
          )}
        </div>
      )}
    </div>
  );
}
