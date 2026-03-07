import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
    } catch {
      // Intentionally ignore — always show success to prevent enumeration
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
        <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-neutral-100">Check your email</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-neutral-400">
              If an account exists for <span className="text-neutral-200">{email}</span>,
              we sent a password reset link. Check your inbox.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm text-neutral-300 hover:text-neutral-100">
              Back to sign in
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
          <CardTitle className="text-xl font-bold text-neutral-100">Reset password</CardTitle>
          <p className="text-sm text-neutral-500">Enter your email to receive a reset link</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-neutral-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            <Link to="/login" className="text-neutral-300 hover:text-neutral-100">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
