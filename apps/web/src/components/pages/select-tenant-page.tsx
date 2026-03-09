import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, setActiveTenant, getAccount, type StoredTenant } from "@/lib/api-client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Mail } from "lucide-react";
import type { PendingInvitation, AcceptInvitationResponse } from "@/types/tenant";

export function SelectTenantPage() {
  const navigate = useNavigate();
  const account = getAccount();
  const [tenants, setTenants] = useState<StoredTenant[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ tenants: StoredTenant[] }>("/auth/me"),
      api.get<{ invitations: PendingInvitation[] }>("/tenants/invitations/pending").catch(() => ({ invitations: [] })),
    ])
      .then(([me, inv]) => {
        setTenants(me.tenants);
        setPendingInvitations(inv.invitations);
      })
      .catch(() => navigate({ to: "/login" }))
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleSelect(tenant: StoredTenant) {
    setActiveTenant(tenant);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="border-neutral-800 bg-neutral-900/60">
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
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => navigate({ to: "/create-tenant" })}
                className="w-full text-neutral-400 hover:text-neutral-200"
              >
                <Plus className="mr-2 size-4" />
                Create new workspace
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        {!loading && pendingInvitations.length > 0 && (
          <Card className="border-neutral-800 bg-neutral-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-neutral-100">
                <Mail className="size-4" />
                Pending invitations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-100">{inv.tenantName}</p>
                      <p className="text-xs text-neutral-500">
                        Invited by {inv.inviterName} as{" "}
                        <Badge variant="outline" className="ml-1 border-neutral-600 text-xs">
                          {inv.role}
                        </Badge>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={acceptingId === inv.id}
                      onClick={async () => {
                        // Invitations from the pending list don't carry the raw token.
                        // The user needs to use the email link to accept.
                        // Navigate to the accept page — but we don't have the token here.
                        // For now, show a note about using the email link.
                        toast.info("Check your email for the invitation link to accept.");
                      }}
                    >
                      Accept via email
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
