import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export function ResetPasswordPage() {
  const { token } = useSearch({ strict: false }) as { token?: string };
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!token) {
      setError("Missing reset token");
      setLoading(false);
      return;
    }

    try {
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
        <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-neutral-100">Password reset</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-neutral-400">Your password has been updated. You can now sign in.</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-neutral-300 hover:text-neutral-100">
              Go to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-neutral-100">New password</CardTitle>
          <p className="text-sm text-neutral-500">Choose a new password for your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-neutral-300">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
                minLength={8}
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
