import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuotas, useUpsertQuotas } from "@/hooks/use-quotas";
import type { UpsertQuota } from "@/types/quota";

export function QuotasPage() {
  const { data, isLoading } = useQuotas();
  const upsertMutation = useUpsertQuotas();

  const [maxAiTokens, setMaxAiTokens] = useState("");
  const [maxWaMessages, setMaxWaMessages] = useState("");
  const [maxApiRequests, setMaxApiRequests] = useState("");
  const [maxRpm, setMaxRpm] = useState("60");

  useEffect(() => {
    if (data?.quotas) {
      const q = data.quotas;
      setMaxAiTokens(q.maxAiTokensPerMonth?.toString() ?? "");
      setMaxWaMessages(q.maxWhatsappMessagesPerMonth?.toString() ?? "");
      setMaxApiRequests(q.maxApiRequestsPerMonth?.toString() ?? "");
      setMaxRpm(q.maxRequestsPerMinute.toString());
    }
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-96 rounded-lg bg-neutral-800" />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: UpsertQuota = {
      maxAiTokensPerMonth: maxAiTokens ? Number(maxAiTokens) : null,
      maxWhatsappMessagesPerMonth: maxWaMessages ? Number(maxWaMessages) : null,
      maxApiRequestsPerMonth: maxApiRequests ? Number(maxApiRequests) : null,
      maxRequestsPerMinute: Number(maxRpm) || 60,
    };
    upsertMutation.mutate(body, {
      onSuccess: () => toast.success("Quotas updated"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-100">Quotas</h1>
        <Button type="submit" disabled={upsertMutation.isPending}>
          {upsertMutation.isPending ? "Saving..." : "Save Quotas"}
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Left — Monthly limits */}
        <div className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
          <h2 className="text-sm font-medium text-neutral-400">Monthly Limits</h2>

          <div className="space-y-2">
            <Label className="text-neutral-300">Max AI Tokens / Month</Label>
            <Input
              type="number"
              min="0"
              value={maxAiTokens}
              onChange={(e) => setMaxAiTokens(e.target.value)}
              placeholder="Unlimited"
              className="border-neutral-700 bg-neutral-800 font-mono text-neutral-100 placeholder:text-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Max WhatsApp Messages / Month</Label>
            <Input
              type="number"
              min="0"
              value={maxWaMessages}
              onChange={(e) => setMaxWaMessages(e.target.value)}
              placeholder="Unlimited"
              className="border-neutral-700 bg-neutral-800 font-mono text-neutral-100 placeholder:text-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Max API Requests / Month</Label>
            <Input
              type="number"
              min="0"
              value={maxApiRequests}
              onChange={(e) => setMaxApiRequests(e.target.value)}
              placeholder="Unlimited"
              className="border-neutral-700 bg-neutral-800 font-mono text-neutral-100 placeholder:text-neutral-600"
            />
          </div>
        </div>

        {/* Right — Rate limiting */}
        <div className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
          <h2 className="text-sm font-medium text-neutral-400">Rate Limiting</h2>

          <div className="space-y-2">
            <Label className="text-neutral-300">Max Requests / Minute</Label>
            <Input
              type="number"
              min="1"
              value={maxRpm}
              onChange={(e) => setMaxRpm(e.target.value)}
              className="border-neutral-700 bg-neutral-800 font-mono text-neutral-100"
              required
            />
          </div>
        </div>
      </div>
    </form>
  );
}
