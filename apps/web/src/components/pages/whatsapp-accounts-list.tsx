import { Link } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWhatsAppAccounts, useDeleteWhatsAppAccount } from "@/hooks/use-whatsapp-accounts";

export function WhatsAppAccountsList() {
  const { data, isLoading } = useWhatsAppAccounts();
  const deleteMutation = useDeleteWhatsAppAccount();

  function handleDelete(id: string, phone: string) {
    if (!confirm(`Delete account "${phone}"?`)) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(`Deleted "${phone}"`),
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg bg-neutral-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-100">WhatsApp Accounts</h1>
        <Button asChild size="sm">
          <Link to="/whatsapp-accounts/new">
            <Plus className="mr-2 size-4" />
            New Account
          </Link>
        </Button>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 py-16">
          <MessageCircle className="mb-3 size-10 text-neutral-600" />
          <p className="text-neutral-500">No WhatsApp accounts yet</p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/whatsapp-accounts/new">Add your first account</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400">Phone</TableHead>
                <TableHead className="text-neutral-400">WABA ID</TableHead>
                <TableHead className="text-neutral-400">Auto-Reply</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-right text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((acct) => (
                <TableRow
                  key={acct.id}
                  className="border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/50"
                >
                  <TableCell className="font-mono text-neutral-100">
                    {acct.displayPhoneNumber || acct.phoneNumberId}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-neutral-400">{acct.wabaId}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        acct.autoReplyEnabled
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-neutral-700 text-neutral-500"
                      }
                    >
                      {acct.autoReplyEnabled ? "On" : "Off"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        acct.isActive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-400"
                      }
                    >
                      {acct.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/whatsapp-accounts/$accountId"
                          params={{ accountId: acct.id }}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDelete(acct.id, acct.displayPhoneNumber || acct.phoneNumberId)
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
