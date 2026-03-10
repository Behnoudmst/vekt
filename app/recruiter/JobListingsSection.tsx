"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Briefcase,
    MapPin,
    PlusCircle,
    Trash,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type JobListing = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  isActive: boolean;
  createdAt: Date;
  _count: { candidates: number };
};

type Props = {
  listings: JobListing[];
};

export default function JobListingsSection({ listings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const data = new FormData(e.currentTarget);
    const body = {
      title: data.get("title") as string,
      description: data.get("description") as string,
      location: (data.get("location") as string) || undefined,
    };

    try {
      const res = await fetch("/api/job-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setFormError(json.error ?? "Failed to create listing");
        return;
      }

      setShowForm(false);
      startTransition(() => router.refresh());
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await fetch(`/api/job-listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      startTransition(() => router.refresh());
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/job-listings/${id}`, { method: "DELETE" });
      startTransition(() => router.refresh());
    } catch {
      // ignore
    }
  }

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      {/* Section header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Job Listings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage open positions visible on the public home page
          </p>
        </div>
        <Button
          size="sm"
          variant={showForm ? "outline" : "default"}
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
        >
          <PlusCircle data-icon="inline-start" />
          {showForm ? "Cancel" : "Add Listing"}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">New Job Listing</CardTitle>
            <CardDescription>Fill in the details for the new position</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="jl-title">Title</Label>
                <Input
                  id="jl-title"
                  name="title"
                  placeholder="e.g. Senior Backend Engineer"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="jl-location">Location</Label>
                <Input
                  id="jl-location"
                  name="location"
                  placeholder="e.g. Remote / Berlin, DE (optional)"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="jl-description">Description</Label>
                <Textarea
                  id="jl-description"
                  name="description"
                  rows={4}
                  placeholder="Describe the role, requirements, and responsibilities…"
                  required
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <Button type="submit" disabled={isSubmitting} className="self-end">
                {isSubmitting ? "Creating…" : "Create Listing"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listings */}
      {listings.length === 0 ? (
        <Card className="items-center py-12">
          <Briefcase className="size-10 text-muted-foreground" weight="thin" />
          <CardHeader className="items-center text-center">
            <CardTitle>No listings yet</CardTitle>
            <CardDescription>
              Create your first job listing to start receiving applications.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => (
            <Card key={listing.id} size="sm">
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{listing.title}</p>
                    <Badge variant={listing.isActive ? "default" : "secondary"} className="shrink-0 text-xs">
                      {listing.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {listing.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {listing.location}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {listing.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {listing._count.candidates}{" "}
                    {listing._count.candidates === 1 ? "applicant" : "applicants"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(listing.id, listing.isActive)}
                  >
                    {listing.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(listing.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
