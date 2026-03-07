import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, setActiveTenant, getAccount, type StoredTenant } from "@/lib/api-client";
import { useEffect, useState } from "react";

export function SelectTenantPage() {
  const navigate = useNavigate();
  const account = getAccount();
  const [tenants, setTenants] = useState<StoredTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ tenants: StoredTenant[] }>("/auth/me")
      .then((data) => setTenants(data.tenants))
      .catch(() => navigate({ to: "/login" }))
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleSelect(tenant: StoredTenant) {
    setActiveTenant(tenant);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-neutral-100">Select workspace</CardTitle>
          {account && (
            <p className="text-sm text-neutral-500">
              Signed in as {account.email}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-sm text-neutral-400">Loading...</p>
          ) : tenants.length === 0 ? (
            <p className="text-center text-sm text-neutral-400">
              You don't belong to any workspace yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.tenantId}
                  onClick={() => handleSelect(tenant)}
                  className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-left transition-colors hover:border-neutral-600 hover:bg-neutral-800"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-100">{tenant.tenantName}</p>
                    <p className="text-xs text-neutral-500">{tenant.tenantSlug}</p>
                  </div>
                  <span className="text-xs text-neutral-400">{tenant.role}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
