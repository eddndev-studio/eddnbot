import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiConfig, useCreateAiConfig, useUpdateAiConfig } from "@/hooks/use-ai-configs";
import type { CreateAiConfig, UpdateAiConfig } from "@/types/ai-config";

interface Props {
  mode: "create" | "edit";
  configId?: string;
}

export function AiConfigForm({ mode, configId }: Props) {
  const navigate = useNavigate();
  const { data: existing, isLoading } = useAiConfig(configId ?? "");
  const createMutation = useCreateAiConfig();
  const updateMutation = useUpdateAiConfig(configId ?? "");

  const [label, setLabel] = useState("default");
  const [provider, setProvider] = useState<"openai" | "anthropic" | "gemini">("openai");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");

  useEffect(() => {
    if (existing && mode === "edit") {
      setLabel(existing.label);
      setProvider(existing.provider);
      setModel(existing.model);
      setSystemPrompt(existing.systemPrompt ?? "");
      setTemperature(existing.temperature?.toString() ?? "");
      setMaxOutputTokens(existing.maxOutputTokens?.toString() ?? "");
    }
  }, [existing, mode]);

  if (mode === "edit" && isLoading) {
    return <Skeleton className="h-96 rounded-lg bg-neutral-800" />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "create") {
      const data: CreateAiConfig = {
        label,
        provider,
        model,
        ...(systemPrompt && { systemPrompt }),
        ...(temperature && { temperature: Number(temperature) }),
        ...(maxOutputTokens && { maxOutputTokens: Number(maxOutputTokens) }),
      };
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("AI config created");
          navigate({ to: "/ai-configs" });
        },
        onError: (err) => toast.error(err.message),
      });
    } else {
      const data: UpdateAiConfig = {
        label,
        provider,
        model,
        systemPrompt: systemPrompt || null,
        temperature: temperature ? Number(temperature) : null,
        maxOutputTokens: maxOutputTokens ? Number(maxOutputTokens) : null,
      };
      updateMutation.mutate(data, {
        onSuccess: () => {
          toast.success("AI config updated");
          navigate({ to: "/ai-configs" });
        },
        onError: (err) => toast.error(err.message),
      });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className="mx-auto max-w-lg border-neutral-800 bg-neutral-900/60">
      <CardHeader>
        <CardTitle className="text-neutral-100">
          {mode === "create" ? "New AI Config" : "Edit AI Config"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-neutral-300">Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="border-neutral-700 bg-neutral-800 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
              <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-neutral-700 bg-neutral-800">
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o, claude-sonnet-4-20250514, etc."
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">System Prompt</Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="Optional system prompt..."
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="0.7"
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Max Output Tokens</Label>
              <Input
                type="number"
                min="1"
                value={maxOutputTokens}
                onChange={(e) => setMaxOutputTokens(e.target.value)}
                placeholder="4096"
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/ai-configs" })}
              className="border-neutral-700 text-neutral-300"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
