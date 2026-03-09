import { createFileRoute, redirect } from "@tanstack/react-router";
import { AcceptInvitationPage } from "@/components/pages/accept-invitation-page";
import { isAuthenticated } from "@/lib/api-client";

export const Route = createFileRoute("/accept-invitation")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || "",
  }),
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AcceptInvitationPage,
});
