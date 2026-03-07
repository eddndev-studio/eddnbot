import { useEffect, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";

export function VerifyEmailPage() {
  const { token } = useSearch({ strict: false }) as { token?: string };
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token");
      return;
    }

    api
      .post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-sm border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-neutral-100">
            {status === "loading" && "Verifying..."}
            {status === "success" && "Email verified"}
            {status === "error" && "Verification failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && (
            <p className="text-sm text-neutral-400">Please wait while we verify your email.</p>
          )}
          {status === "success" && (
            <>
              <p className="text-sm text-neutral-400">Your email has been verified. You can now sign in.</p>
              <Link to="/login" className="mt-4 inline-block text-sm text-neutral-300 hover:text-neutral-100">
                Go to sign in
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <p className="text-sm text-red-400">{error}</p>
              <Link to="/login" className="mt-4 inline-block text-sm text-neutral-300 hover:text-neutral-100">
                Back to sign in
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
