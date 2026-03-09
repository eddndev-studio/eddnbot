import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, ShieldCheck, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveTenant } from "@/lib/api-client";
import {
  useTenantMembers,
  useUpdateMemberRole,
  useRemoveMember,
} from "@/hooks/use-tenant-members";
import {
  useTenantInvitations,
  useCreateInvitation,
  useRevokeInvitation,
} from "@/hooks/use-tenant-invitations";

const roleBadge: Record<string, { label: string; variant: string; icon: typeof Crown }> = {
  owner: { label: "Owner", variant: "text-amber-400 bg-amber-400/10", icon: Crown },
  admin: { label: "Admin", variant: "text-violet-400 bg-violet-400/10", icon: ShieldCheck },
  member: { label: "Member", variant: "text-neutral-400 bg-neutral-400/10", icon: Shield },
};

export function MembersPage() {
  const tenant = getActiveTenant();
  const { data: members, isLoading: membersLoading } = useTenantMembers();
  const { data: invitations, isLoading: invitationsLoading } = useTenantInvitations();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const createInvite = useCreateInvitation();
  const revokeInvite = useRevokeInvitation();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const isOwner = tenant?.role === "owner";
  const canManage = tenant?.role === "owner" || tenant?.role === "admin";

  function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    createInvite.mutate(
      { email: inviteEmail.trim().toLowerCase(), role: inviteRole },
      {
        onSuccess: () => {
          toast.success("Invitation sent");
          setInviteEmail("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleRoleChange(memberId: string, newRole: string) {
    updateRole.mutate(
      { memberId, role: newRole },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from this workspace?`)) return;
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success("Member removed"),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleRevoke(invitationId: string) {
    if (!confirm("Revoke this invitation?")) return;
    revokeInvite.mutate(invitationId, {
      onSuccess: () => toast.success("Invitation revoked"),
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      {canManage && (
        <Card className="border-neutral-800 bg-neutral-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-neutral-100">
              <UserPlus className="size-4" />
              Invite member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex gap-3">
              <Input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 border-neutral-700 bg-neutral-800"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 text-sm text-neutral-200"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" disabled={createInvite.isPending}>
                {createInvite.isPending ? "Sending..." : "Send invite"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card className="border-neutral-800 bg-neutral-900/60">
        <CardHeader>
          <CardTitle className="text-base text-neutral-100">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !members?.length ? (
            <p className="text-sm text-neutral-400">No members found.</p>
          ) : (
            <div className="divide-y divide-neutral-800">
              {members.map((member) => {
                const badge = roleBadge[member.role] ?? roleBadge.member;
                const Icon = badge.icon;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-neutral-300">
                        {member.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-100">{member.name}</p>
                        <p className="text-xs text-neutral-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${badge.variant} border-0`}>
                        <Icon className="mr-1 size-3" />
                        {badge.label}
                      </Badge>
                      {isOwner && member.role !== "owner" && (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(member.id, member.name)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                      {!isOwner && canManage && member.role === "member" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member.id, member.name)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {canManage && (
        <Card className="border-neutral-800 bg-neutral-900/60">
          <CardHeader>
            <CardTitle className="text-base text-neutral-100">Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            {invitationsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : !invitations?.length ? (
              <p className="text-sm text-neutral-400">No pending invitations.</p>
            ) : (
              <div className="divide-y divide-neutral-800">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm text-neutral-100">{inv.email}</p>
                      <p className="text-xs text-neutral-500">
                        Invited as {inv.role} by {inv.inviterName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(inv.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
