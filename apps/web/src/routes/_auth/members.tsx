import { createFileRoute } from "@tanstack/react-router";
import { MembersPage } from "@/components/pages/members-page";

export const Route = createFileRoute("/_auth/members")({
  component: MembersPage,
});
