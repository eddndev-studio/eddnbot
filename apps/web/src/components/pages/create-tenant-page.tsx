import { type FormEvent, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, setActiveTenant, getAccount } from "@/lib/api-client";

export function CreateTenantPage() {
  const navigate = useNavigate();
  const account = getAccount();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    // Auto-generate slug from name
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-"),
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    try {
      const tenant = await api.post<{ id: string; name: string; slug: string }>("/tenants", {
        name: name.trim(),
        slug: slug.trim(),
      });
      setActiveTenant({
        tenantId: tenant.id,
        role: "owner",
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
      });
      toast.success("Workspace created");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <Card className="w-full max-w-md border-neutral-800 bg-neutral-900/60">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-neutral-100">Create workspace</CardTitle>
          {account && (
            <p className="text-sm text-neutral-500">Signed in as {account.email}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-neutral-300">
                Workspace name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Company"
                className="border-neutral-700 bg-neutral-800"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-neutral-300">
                URL slug
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-company"
                pattern="^[a-z0-9-]+$"
                className="border-neutral-700 bg-neutral-800"
                required
              />
              <p className="text-xs text-neutral-500">
                Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/select-tenant" })}
                className="flex-1 text-neutral-400"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
