import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateTenant } from "@/hooks/use-admin-tenants";

export function AdminTenantForm() {
  const navigate = useNavigate();
  const createTenant = useCreateTenant();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const tenant = await createTenant.mutateAsync({ name, slug });
      navigate({ to: "/admin/tenants/$tenantId", params: { tenantId: tenant.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    }
  }

  return (
    <Card className="max-w-lg border-neutral-800 bg-neutral-900/60">
      <CardHeader>
        <CardTitle className="text-neutral-100">Create Tenant</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="text-neutral-300">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Company"
              className="border-neutral-700 bg-neutral-800 text-neutral-100 placeholder:text-neutral-600"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug" className="text-neutral-300">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-company"
              className="border-neutral-700 bg-neutral-800 font-mono text-sm text-neutral-100 placeholder:text-neutral-600"
            />
            <p className="text-xs text-neutral-500">Lowercase letters, numbers, and hyphens only</p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={createTenant.isPending}
              className="bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              {createTenant.isPending ? "Creating..." : "Create Tenant"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/admin/tenants" })}
              className="text-neutral-400"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
