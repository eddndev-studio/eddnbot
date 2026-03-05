import { createFileRoute } from "@tanstack/react-router";
import { DataDeletion } from "@/components/pages/data-deletion";

export const Route = createFileRoute("/data-deletion")({
  component: DataDeletion,
});
