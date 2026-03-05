import { createFileRoute } from "@tanstack/react-router";
import { AiConfigsList } from "@/components/pages/ai-configs-list";

export const Route = createFileRoute("/_auth/ai-configs/")({
  component: AiConfigsList,
});
