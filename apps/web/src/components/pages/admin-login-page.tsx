import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi, setAdminToken } from "@/lib/admin-client";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = token.trim();
    if (!trimmed) {
      setError("Admin token is required");
      setLoading(false);
      return;
    }

    setAdminToken(trimmed);
    try {
      await adminApi.get<{ ok: boolean }>("/admin/auth/verify");
      navigate({ to: "/admin" });
    } catch {
      setError("Invalid admin token");
      setAdminToken("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-amber-400/10">
            <Shield className="size-5 text-amber-400" />
          </div>
          <CardTitle className="text-xl font-bold text-neutral-100">eddnbot Admin</CardTitle>
          <p className="text-sm text-neutral-500">Enter admin token to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="admin-token" className="text-neutral-300">
                Admin Token
              </Label>
              <Input
                id="admin-token"
                type="password"
                placeholder="Enter admin secret..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {loading ? "Validating..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
