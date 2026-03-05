import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useWhatsAppAccount,
  useCreateWhatsAppAccount,
  useUpdateWhatsAppAccount,
} from "@/hooks/use-whatsapp-accounts";
import { useAiConfigs } from "@/hooks/use-ai-configs";
import type { CreateWhatsAppAccount, UpdateWhatsAppAccount } from "@/types/whatsapp-account";

const NONE = "__none__";

interface Props {
  mode: "create" | "edit";
  accountId?: string;
}

export function WhatsAppAccountForm({ mode, accountId }: Props) {
  const navigate = useNavigate();
  const { data: existing, isLoading } = useWhatsAppAccount(accountId ?? "");
  const { data: aiConfigs } = useAiConfigs();
  const createMutation = useCreateWhatsAppAccount();
  const updateMutation = useUpdateWhatsAppAccount(accountId ?? "");

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [aiConfigId, setAiConfigId] = useState(NONE);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (existing && mode === "edit") {
      setPhoneNumberId(existing.phoneNumberId);
      setWabaId(existing.wabaId);
      setAccessToken(existing.accessToken);
      setDisplayPhoneNumber(existing.displayPhoneNumber ?? "");
      setWebhookVerifyToken(existing.webhookVerifyToken ?? "");
      setAiConfigId(existing.aiConfigId ?? NONE);
      setAutoReplyEnabled(existing.autoReplyEnabled);
      setIsActive(existing.isActive);
    }
  }, [existing, mode]);

  if (mode === "edit" && isLoading) {
    return <Skeleton className="h-96 rounded-lg bg-neutral-800" />;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "create") {
      const data: CreateWhatsAppAccount = {
        phoneNumberId,
        wabaId,
        accessToken,
        ...(displayPhoneNumber && { displayPhoneNumber }),
        ...(webhookVerifyToken && { webhookVerifyToken }),
        aiConfigId: aiConfigId === NONE ? null : aiConfigId,
        autoReplyEnabled,
      };
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Account created");
          navigate({ to: "/whatsapp-accounts" });
        },
        onError: (err) => toast.error(err.message),
      });
    } else {
      const data: UpdateWhatsAppAccount = {
        displayPhoneNumber: displayPhoneNumber || null,
        accessToken,
        webhookVerifyToken: webhookVerifyToken || null,
        aiConfigId: aiConfigId === NONE ? null : aiConfigId,
        autoReplyEnabled,
        isActive,
      };
      updateMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Account updated");
          navigate({ to: "/whatsapp-accounts" });
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
          {mode === "create" ? "New WhatsApp Account" : "Edit WhatsApp Account"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-neutral-300">Phone Number ID</Label>
            <Input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              disabled={mode === "edit"}
              required
              className="border-neutral-700 bg-neutral-800 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">WABA ID</Label>
            <Input
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              disabled={mode === "edit"}
              required
              className="border-neutral-700 bg-neutral-800 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Access Token</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              required
              className="border-neutral-700 bg-neutral-800 text-neutral-100"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Display Phone Number</Label>
            <Input
              value={displayPhoneNumber}
              onChange={(e) => setDisplayPhoneNumber(e.target.value)}
              placeholder="+1 555 123 4567"
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Webhook Verify Token</Label>
            <Input
              value={webhookVerifyToken}
              onChange={(e) => setWebhookVerifyToken(e.target.value)}
              placeholder="Optional"
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">AI Config</Label>
            <Select value={aiConfigId} onValueChange={setAiConfigId}>
              <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="border-neutral-700 bg-neutral-800">
                <SelectItem value={NONE}>None</SelectItem>
                {aiConfigs?.map((cfg) => (
                  <SelectItem key={cfg.id} value={cfg.id}>
                    {cfg.label} ({cfg.provider}/{cfg.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800 px-4 py-3">
            <Label className="text-neutral-300">Auto-Reply</Label>
            <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>

          {mode === "edit" && (
            <div className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-800 px-4 py-3">
              <Label className="text-neutral-300">Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/whatsapp-accounts" })}
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
