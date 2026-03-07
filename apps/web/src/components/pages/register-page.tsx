import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
        <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-neutral-100">Check your email</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-neutral-400">
              We sent a verification link to <span className="text-neutral-200">{email}</span>.
              Please check your inbox and click the link to activate your account.
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
          <CardTitle className="text-xl font-bold text-neutral-100">eddnbot</CardTitle>
          <p className="text-sm text-neutral-500">Create your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-neutral-300">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
                required
              />
            </div>
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-neutral-300">Password</Label>
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
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link to="/login" className="text-neutral-300 hover:text-neutral-100">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
