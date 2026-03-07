import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiConfig, useCreateAiConfig, useUpdateAiConfig } from "@/hooks/use-ai-configs";
import { useAiModels } from "@/hooks/use-ai-models";
import type { CreateAiConfig, UpdateAiConfig, ThinkingConfig, ModelDefinition } from "@/types/ai-config";

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
  const [customModel, setCustomModel] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");

  // Thinking state
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [thinkingEffort, setThinkingEffort] = useState("medium");
  const [thinkingBudget, setThinkingBudget] = useState("");
  const [thinkingLevel, setThinkingLevel] = useState("medium");

  const { data: models } = useAiModels(provider);
  const selectedModel = models?.find((m) => m.id === model);

  useEffect(() => {
    if (existing && mode === "edit") {
      setLabel(existing.label);
      setProvider(existing.provider);
      setModel(existing.model);
      setSystemPrompt(existing.systemPrompt ?? "");
      setTemperature(existing.temperature?.toString() ?? "");
      setMaxOutputTokens(existing.maxOutputTokens?.toString() ?? "");

      // Hydrate thinking state
      if (existing.thinkingConfig) {
        setThinkingEnabled(true);
        const tc = existing.thinkingConfig;
        if (tc.provider === "openai") {
          setThinkingEffort(tc.config.effort);
        } else if (tc.provider === "anthropic") {
          setThinkingBudget(tc.config.budgetTokens.toString());
        } else if (tc.provider === "gemini") {
          if (tc.config.thinkingBudget != null) {
            setThinkingBudget(tc.config.thinkingBudget.toString());
          }
          if (tc.config.thinkingLevel) {
            setThinkingLevel(tc.config.thinkingLevel);
          }
        }
      }
    }
  }, [existing, mode]);

  // Check if model is custom (not in registry)
  useEffect(() => {
    if (models && model && !models.find((m) => m.id === model)) {
      setCustomModel(true);
    }
  }, [models, model]);

  // Reset model when provider changes (only in create mode or manual changes)
  function handleProviderChange(newProvider: typeof provider) {
    setProvider(newProvider);
    setModel("");
    setCustomModel(false);
    setThinkingEnabled(false);
    setThinkingEffort("medium");
    setThinkingBudget("");
    setThinkingLevel("medium");
  }

  function handleModelSelect(value: string) {
    if (value === "__custom__") {
      setCustomModel(true);
      setModel("");
      setThinkingEnabled(false);
      return;
    }
    setCustomModel(false);
    setModel(value);

    // Set thinking defaults from model capabilities
    const m = models?.find((mod) => mod.id === value);
    if (m?.capabilities.thinking) {
      setThinkingEnabled(false);
      const t = m.capabilities.thinking;
      if (t.type === "effort") setThinkingEffort(t.default);
      else if (t.type === "budget_tokens") setThinkingBudget(t.default.toString());
      else if (t.type === "thinking_budget") setThinkingBudget(t.default.toString());
      else if (t.type === "thinking_level") setThinkingLevel(t.default);
    } else {
      setThinkingEnabled(false);
    }
  }

  if (mode === "edit" && isLoading) {
    return <Skeleton className="h-96 rounded-lg bg-neutral-800" />;
  }

  function buildThinkingConfig(): ThinkingConfig | undefined {
    if (!thinkingEnabled) return undefined;
    if (!selectedModel?.capabilities.thinking && !customModel) return undefined;

    if (provider === "openai") {
      return { provider: "openai", config: { effort: thinkingEffort } };
    }
    if (provider === "anthropic") {
      return { provider: "anthropic", config: { budgetTokens: Number(thinkingBudget) } };
    }
    if (provider === "gemini") {
      const thinkingType = selectedModel?.capabilities.thinking?.type;
      if (thinkingType === "thinking_level") {
        return { provider: "gemini", config: { thinkingLevel } };
      }
      return { provider: "gemini", config: { thinkingBudget: Number(thinkingBudget) } };
    }
    return undefined;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const thinkingConfig = buildThinkingConfig();

    if (mode === "create") {
      const data: CreateAiConfig = {
        label,
        provider,
        model,
        ...(systemPrompt && { systemPrompt }),
        ...(temperature && { temperature: Number(temperature) }),
        ...(maxOutputTokens && { maxOutputTokens: Number(maxOutputTokens) }),
        ...(thinkingConfig && { thinkingConfig }),
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
        thinkingConfig: thinkingConfig ?? null,
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
  const thinkingCaps = selectedModel?.capabilities.thinking;
  const canThink = !!thinkingCaps;

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
            <Select value={provider} onValueChange={(v) => handleProviderChange(v as typeof provider)}>
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
            {customModel ? (
              <div className="space-y-2">
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Enter custom model ID..."
                  className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => { setCustomModel(false); setModel(""); }}
                  className="text-xs text-neutral-500 hover:text-neutral-300"
                >
                  Back to model list
                </button>
              </div>
            ) : (
              <Select value={model} onValueChange={handleModelSelect}>
                <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 border-neutral-700 bg-neutral-800">
                  {models?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span>{m.name}</span>
                      <span className="ml-2 text-xs text-neutral-500">{m.id}</span>
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">
                    <span className="text-neutral-400">Custom model...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {selectedModel && (
              <p className="text-xs text-neutral-500">
                Max output: {selectedModel.capabilities.maxOutputTokens.toLocaleString()} tokens
              </p>
            )}
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
                max={selectedModel?.capabilities.maxTemperature ?? 2}
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
                max={selectedModel?.capabilities.maxOutputTokens}
                value={maxOutputTokens}
                onChange={(e) => setMaxOutputTokens(e.target.value)}
                placeholder={selectedModel?.capabilities.maxOutputTokens?.toString() ?? "4096"}
                className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
          </div>

          {/* Thinking Configuration */}
          {(canThink || customModel) && (
            <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="flex items-center justify-between">
                <Label className="text-neutral-300">Thinking / Reasoning</Label>
                <Switch
                  checked={thinkingEnabled}
                  onCheckedChange={setThinkingEnabled}
                />
              </div>

              {thinkingEnabled && (
                <ThinkingConfigUI
                  provider={provider}
                  thinkingCaps={thinkingCaps}
                  thinkingEffort={thinkingEffort}
                  onEffortChange={setThinkingEffort}
                  thinkingBudget={thinkingBudget}
                  onBudgetChange={setThinkingBudget}
                  thinkingLevel={thinkingLevel}
                  onLevelChange={setThinkingLevel}
                />
              )}
            </div>
          )}

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

function ThinkingConfigUI({
  provider,
  thinkingCaps,
  thinkingEffort,
  onEffortChange,
  thinkingBudget,
  onBudgetChange,
  thinkingLevel,
  onLevelChange,
}: {
  provider: string;
  thinkingCaps: ModelDefinition["capabilities"]["thinking"];
  thinkingEffort: string;
  onEffortChange: (v: string) => void;
  thinkingBudget: string;
  onBudgetChange: (v: string) => void;
  thinkingLevel: string;
  onLevelChange: (v: string) => void;
}) {
  // Determine the thinking type
  const type = thinkingCaps?.type;

  if (provider === "openai" || type === "effort") {
    const options = type === "effort" ? thinkingCaps!.options : ["low", "medium", "high"];
    return (
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400">Reasoning Effort</Label>
        <Select value={thinkingEffort} onValueChange={onEffortChange}>
          <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-neutral-700 bg-neutral-800">
            {(options as string[]).map((o) => (
              <SelectItem key={o} value={o}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (provider === "anthropic" || type === "budget_tokens") {
    const min = type === "budget_tokens" ? thinkingCaps!.min : 1024;
    const max = type === "budget_tokens" ? thinkingCaps!.max : 128000;
    return (
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400">Budget Tokens</Label>
        <Input
          type="number"
          min={min}
          max={max}
          value={thinkingBudget}
          onChange={(e) => onBudgetChange(e.target.value)}
          placeholder={`${min} – ${max}`}
          className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
        />
        <p className="text-[11px] text-amber-400/70">
          Temperature is forced to 1.0 when thinking is enabled
        </p>
      </div>
    );
  }

  if (type === "thinking_level") {
    const options = thinkingCaps!.options;
    return (
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400">Thinking Level</Label>
        <Select value={thinkingLevel} onValueChange={onLevelChange}>
          <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-neutral-700 bg-neutral-800">
            {(options as string[]).map((o) => (
              <SelectItem key={o} value={o}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "thinking_budget") {
    const min = thinkingCaps!.min;
    const max = thinkingCaps!.max;
    return (
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400">Thinking Budget</Label>
        <Input
          type="number"
          min={min}
          max={max}
          value={thinkingBudget}
          onChange={(e) => onBudgetChange(e.target.value)}
          placeholder={`${min} – ${max}`}
          className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
        />
      </div>
    );
  }

  // Fallback for custom models — show effort select
  return (
    <div className="space-y-2">
      <Label className="text-xs text-neutral-400">Reasoning Effort</Label>
      <Select value={thinkingEffort} onValueChange={onEffortChange}>
        <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-neutral-700 bg-neutral-800">
          {["low", "medium", "high"].map((o) => (
            <SelectItem key={o} value={o}>
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
