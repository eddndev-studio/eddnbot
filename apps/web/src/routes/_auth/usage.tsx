import { createFileRoute } from "@tanstack/react-router";
import { UsageDetails } from "@/components/pages/usage-details";

export const Route = createFileRoute("/_auth/usage")({
  component: UsageDetails,
});
