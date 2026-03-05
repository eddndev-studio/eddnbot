import { useState } from "react";
import { Brain, MessageCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";

function now() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface StatRowProps {
  label: string;
  value: number;
  limit: number | null;
  accent: string;
  accentBg: string;
  icon: React.ReactNode;
}

function StatRow({ label, value, limit, accent, accentBg, icon }: StatRowProps) {
  const pct = limit ? Math.min((value / limit) * 100, 100) : null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 transition-all duration-200 hover:border-neutral-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={accent}>{icon}</span>
          <span className="text-sm font-medium text-neutral-300">{label}</span>
        </div>
        <span className="font-mono text-lg font-bold text-neutral-100">
          {value.toLocaleString()}
        </span>
      </div>
      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
            <div
              className={cn("h-full rounded-full transition-all duration-700", accentBg)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-neutral-500">
            {value.toLocaleString()} / {limit!.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export function UsageDetails() {
  const [month, setMonth] = useState(now);
  const { data, isLoading } = useUsage(month);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold text-neutral-100">Usage</h1>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-500">Month</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-9 w-40 border-neutral-700 bg-neutral-800 text-sm text-neutral-100"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setMonth(now())} className="border-neutral-700 text-neutral-300">
            Current
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg bg-neutral-800" />
          ))}
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <StatRow
              label="AI Tokens"
              value={data.aiTokens.total}
              limit={data.quotas?.maxAiTokensPerMonth ?? null}
              accent="text-cyan-400"
              accentBg="bg-cyan-500"
              icon={<Brain className="size-4" />}
            />
            <StatRow
              label="WhatsApp Messages"
              value={data.whatsappMessages}
              limit={data.quotas?.maxWhatsappMessagesPerMonth ?? null}
              accent="text-emerald-400"
              accentBg="bg-emerald-500"
              icon={<MessageCircle className="size-4" />}
            />
            <StatRow
              label="API Requests"
              value={data.apiRequests}
              limit={data.quotas?.maxApiRequestsPerMonth ?? null}
              accent="text-violet-400"
              accentBg="bg-violet-500"
              icon={<Globe className="size-4" />}
            />
          </div>

          {Object.keys(data.aiTokens.byProvider).length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-neutral-300">Tokens by Provider</h3>
              <div className="space-y-2">
                {Object.entries(data.aiTokens.byProvider).map(([provider, tokens]) => (
                  <div
                    key={provider}
                    className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900/40 px-4 py-2"
                  >
                    <span className="text-sm text-neutral-400">{provider}</span>
                    <span className="font-mono text-sm text-neutral-200">
                      {tokens.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
