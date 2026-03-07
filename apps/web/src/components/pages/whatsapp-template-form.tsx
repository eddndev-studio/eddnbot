import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useCreateWhatsAppTemplate } from "@/hooks/use-whatsapp-templates";
import type { TemplateCategory, TemplateComponent } from "@/types/whatsapp-template";

const LANGUAGES = [
  { value: "en_US", label: "English (US)" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "es_AR", label: "Spanish (Argentina)" },
  { value: "es_MX", label: "Spanish (Mexico)" },
  { value: "pt_BR", label: "Portuguese (Brazil)" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh_CN", label: "Chinese (Simplified)" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

interface Props {
  accountId: string;
}

export function WhatsAppTemplateForm({ accountId }: Props) {
  const navigate = useNavigate();
  const createMutation = useCreateWhatsAppTemplate(accountId);

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [category, setCategory] = useState<TemplateCategory>("MARKETING");
  const [body, setBody] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const components: TemplateComponent[] = [];

    if (headerText.trim()) {
      components.push({ type: "HEADER", format: "TEXT", text: headerText.trim() });
    }

    components.push({ type: "BODY", text: body });

    if (footerText.trim()) {
      components.push({ type: "FOOTER", text: footerText.trim() });
    }

    createMutation.mutate(
      { name, language, category, components },
      {
        onSuccess: () => {
          toast.success("Template submitted for review");
          navigate({
            to: "/whatsapp-accounts/$accountId/templates",
            params: { accountId },
          });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-100">New Message Template</h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigate({
                to: "/whatsapp-accounts/$accountId/templates",
                params: { accountId },
              })
            }
            className="border-neutral-700 text-neutral-300"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Submitting..." : "Create Template"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-6">
        {/* Left column — Metadata */}
        <div className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
          <h2 className="text-sm font-medium text-neutral-400">Details</h2>

          <div className="space-y-2">
            <Label className="text-neutral-300">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="order_confirmation"
              required
              pattern="^[a-z0-9_]+$"
              title="Only lowercase letters, numbers and underscores"
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
            <p className="text-xs text-neutral-500">
              Lowercase letters, numbers and underscores only
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-neutral-300">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-800">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-neutral-300">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as TemplateCategory)}
              >
                <SelectTrigger className="border-neutral-700 bg-neutral-800 text-neutral-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-neutral-700 bg-neutral-800">
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Right column — Content */}
        <div className="space-y-5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
          <h2 className="text-sm font-medium text-neutral-400">Content</h2>

          <div className="space-y-2">
            <Label className="text-neutral-300">Header (optional)</Label>
            <Input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Header text"
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hello {{1}}, your order {{2}} has been confirmed."
              required
              rows={6}
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
            <p className="text-xs text-neutral-500">
              {"Use {{1}}, {{2}}, etc. for variables"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-neutral-300">Footer (optional)</Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Reply STOP to unsubscribe"
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
