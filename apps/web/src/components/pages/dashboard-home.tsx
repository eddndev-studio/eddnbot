import { Brain, MessageCircle, Globe, Gauge } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsage } from "@/hooks/use-usage";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number;
  limit: number | null;
  accent: string;
  accentBg: string;
  icon: React.ReactNode;
  breakdown?: Record<string, number>;
}

function MetricCard({ title, value, limit, accent, accentBg, icon, breakdown }: MetricCardProps) {
  const pct = limit ? Math.min((value / limit) * 100, 100) : null;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/60 transition-all duration-200 hover:border-neutral-700">
      <div className={cn("h-[3px]", accentBg)} />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={accent}>{icon}</span>
            <span className="text-sm font-medium text-neutral-400">{title}</span>
          </div>
          <span className="font-mono text-2xl font-bold text-neutral-100">
            {value.toLocaleString()}
          </span>
        </div>

        {pct !== null && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className={cn("h-full rounded-full transition-all duration-700", accentBg)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-neutral-500">
              <span>{Math.round(pct)}%</span>
              <span>Limit: {limit!.toLocaleString()}/mo</span>
            </div>
          </div>
        )}

        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="mt-3 space-y-1 border-t border-neutral-800 pt-3">
            {Object.entries(breakdown).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-neutral-500">{key}</span>
                <span className="font-mono text-neutral-400">{val.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardHome() {
  const { data, isLoading } = useUsage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg bg-neutral-800" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const q = data.quotas;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-100">Overview</h1>
        <p className="text-sm text-neutral-500">
          Usage for {data.month}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="AI Tokens"
          value={data.aiTokens.total}
          limit={q?.maxAiTokensPerMonth ?? null}
          accent="text-cyan-400"
          accentBg="bg-cyan-500"
          icon={<Brain className="size-4" />}
          breakdown={data.aiTokens.byProvider}
        />
        <MetricCard
          title="WhatsApp Messages"
          value={data.whatsappMessages}
          limit={q?.maxWhatsappMessagesPerMonth ?? null}
          accent="text-emerald-400"
          accentBg="bg-emerald-500"
          icon={<MessageCircle className="size-4" />}
        />
        <MetricCard
          title="API Requests"
          value={data.apiRequests}
          limit={q?.maxApiRequestsPerMonth ?? null}
          accent="text-violet-400"
          accentBg="bg-violet-500"
          icon={<Globe className="size-4" />}
        />
        {q && (
          <MetricCard
            title="Rate Limit"
            value={q.maxRequestsPerMinute ?? 60}
            limit={null}
            accent="text-amber-400"
            accentBg="bg-amber-500"
            icon={<Gauge className="size-4" />}
          />
        )}
      </div>
    </div>
  );
}
