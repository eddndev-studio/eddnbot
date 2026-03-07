import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
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
import {
  useWhatsAppTemplates,
  useDeleteWhatsAppTemplate,
} from "@/hooks/use-whatsapp-templates";
import type { TemplateStatus, TemplateCategory } from "@/types/whatsapp-template";

const statusColors: Record<TemplateStatus, string> = {
  APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  REJECTED: "border-red-500/20 bg-red-500/10 text-red-400",
  PAUSED: "border-neutral-500/20 bg-neutral-500/10 text-neutral-400",
  DISABLED: "border-neutral-600/20 bg-neutral-600/10 text-neutral-500",
};

const categoryColors: Record<TemplateCategory, string> = {
  MARKETING: "border-violet-500/20 bg-violet-500/10 text-violet-400",
  UTILITY: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  AUTHENTICATION: "border-orange-500/20 bg-orange-500/10 text-orange-400",
};

interface Props {
  accountId: string;
}

export function WhatsAppTemplatesList({ accountId }: Props) {
  const { data, isLoading } = useWhatsAppTemplates(accountId);
  const deleteMutation = useDeleteWhatsAppTemplate(accountId);

  function handleDelete(name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(name, {
      onSuccess: () => toast.success(`Deleted "${name}"`),
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/whatsapp-accounts">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-neutral-100">Message Templates</h1>
        </div>
        <Button asChild size="sm">
          <Link
            to="/whatsapp-accounts/$accountId/templates/new"
            params={{ accountId }}
          >
            <Plus className="mr-2 size-4" />
            New Template
          </Link>
        </Button>
      </div>

      {!data?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40 py-16">
          <FileText className="mb-3 size-10 text-neutral-600" />
          <p className="text-neutral-500">No templates found</p>
          <Button asChild size="sm" className="mt-4">
            <Link
              to="/whatsapp-accounts/$accountId/templates/new"
              params={{ accountId }}
            >
              Create your first template
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-800 hover:bg-transparent">
                <TableHead className="text-neutral-400">Name</TableHead>
                <TableHead className="text-neutral-400">Language</TableHead>
                <TableHead className="text-neutral-400">Category</TableHead>
                <TableHead className="text-neutral-400">Status</TableHead>
                <TableHead className="text-right text-neutral-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tmpl) => (
                <TableRow
                  key={tmpl.id}
                  className="border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800/50"
                >
                  <TableCell className="font-mono text-neutral-100">
                    {tmpl.name}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-400">
                    {tmpl.language}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={categoryColors[tmpl.category]}>
                      {tmpl.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[tmpl.status]}>
                      {tmpl.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tmpl.name)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="size-4" />
                    </Button>
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
