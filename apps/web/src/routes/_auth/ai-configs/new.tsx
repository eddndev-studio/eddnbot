import { createFileRoute } from "@tanstack/react-router";
import { AiConfigForm } from "@/components/pages/ai-config-form";

export const Route = createFileRoute("/_auth/ai-configs/new")({
  component: () => <AiConfigForm mode="create" />,
});
