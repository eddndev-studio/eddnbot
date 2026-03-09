import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, setActiveTenant, getAccount } from "@/lib/api-client";
import type { AcceptInvitationResponse } from "@/types/tenant";

export function AcceptInvitationPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/accept-invitation" });
  const token = (search as { token?: string }).token;
  const account = getAccount();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<AcceptInvitationResponse | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token provided.");
      return;
    }

    api
      .post<AcceptInvitationResponse>("/tenants/invitations/accept", { token })
      .then((data) => {
        setResult(data);
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to accept invitation");
      });
  }, [token]);

  function handleGoToWorkspace() {
    if (!result) return;
    setActiveTenant({
      tenantId: result.tenantId,
      role: result.role,
      tenantName: result.tenantName,
      tenantSlug: result.tenantSlug,
    });
    toast.success(`Joined ${result.tenantName}`);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-neutral-100">
            {status === "loading"
              ? "Accepting invitation..."
              : status === "success"
                ? "You're in!"
                : "Invitation error"}
          </CardTitle>
          {account && (
            <p className="text-sm text-neutral-500">Signed in as {account.email}</p>
          )}
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && (
            <p className="text-sm text-neutral-400">Processing your invitation...</p>
          )}
          {status === "success" && result && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-300">
                You've joined <span className="font-medium text-neutral-100">{result.tenantName}</span> as{" "}
                <span className="font-medium text-neutral-100">{result.role}</span>.
              </p>
              <Button onClick={handleGoToWorkspace} className="w-full">
                Go to workspace
              </Button>
            </div>
          )}
          {status === "error" && (
            <div className="space-y-4">
              <p className="text-sm text-red-400">{errorMessage}</p>
              <Button
                variant="ghost"
                onClick={() => navigate({ to: "/select-tenant" })}
                className="text-neutral-400"
              >
                Back to workspaces
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
