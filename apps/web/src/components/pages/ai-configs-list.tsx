import { Link } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAiConfigs, useDeleteAiConfig } from "@/hooks/use-ai-configs";

const providerColor: Record<string, string> = {
  openai: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  anthropic: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  gemini: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function AiConfigsList() {
  const { data, isLoading } = useAiConfigs();
  const deleteMutation = useDeleteAiConfig();

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete AI config "${label}"?`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${label}"`),
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg bg-neutral-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-100">AI Configs</h1>
        <Button asChild size="sm">
          <Link to="/ai-configs/new">
            <Plus className="mr-2 size-4" />
            New Config
          </Link>
        </Button>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 py-16">
          <Brain className="mb-3 size-10 text-neutral-600" />
          <p className="text-neutral-500">No AI configs yet</p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/ai-configs/new">Create your first config</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400">Label</TableHead>
                <TableHead className="text-neutral-400">Provider</TableHead>
                <TableHead className="text-neutral-400">Model</TableHead>
                <TableHead className="text-right text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((cfg) => (
                <TableRow
                  key={cfg.id}
                  className="border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/50"
                >
                  <TableCell className="font-medium text-neutral-100">{cfg.label}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={providerColor[cfg.provider]}>
                      {cfg.provider}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-neutral-400">{cfg.model}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/ai-configs/$configId" params={{ configId: cfg.id }}>
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cfg.id, cfg.label)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
