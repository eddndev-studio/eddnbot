import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setApiKey } from "@/lib/api-client";
import type { UsageResponse } from "@/types/usage";

export function LoginPage() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmed = key.trim();
    if (!trimmed) {
      setError("API key is required");
      setLoading(false);
      return;
    }

    setApiKey(trimmed);
    try {
      await api.get<UsageResponse>("/usage");
      navigate({ to: "/" });
    } catch {
      setError("Invalid API key");
      setApiKey("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-neutral-100">eddnbot</CardTitle>
          <p className="text-sm text-neutral-500">Enter your API key to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="api-key" className="text-neutral-300">
                API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                placeholder="ek_live_..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Validating..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
