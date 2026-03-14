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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
    Briefcase,
    CaretLeft,
    CaretRight,
    MagnifyingGlass,
    MapPin,
    PencilSimple,
    PlusCircle,
    Trash,
    X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Job = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  customPrompt: string | null;
  threshold: number;
  isActive: boolean;
  createdAt: Date;
  _count: { candidates: number };
};

type Props = {
  listings: Job[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  status: "all" | "active" | "inactive";
};

type EditState = {
  id: string;
  title: string;
  location: string;
  description: string;
  customPrompt: string;
  threshold: number;
} | null;

export default function JobListingsSection({ listings, total, page, totalPages, q, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [editState, setEditState] = useState<EditState>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [searchInput, setSearchInput] = useState(q);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  function buildUrl(overrides: Partial<{ q: string; status: string; page: string }>) {
    const params = new URLSearchParams();
    const q_ = "q" in overrides ? overrides.q! : q;
    const status_ = "status" in overrides ? overrides.status! : status;
    const page_ = "page" in overrides ? overrides.page! : String(page);
    if (q_) params.set("q", q_);
    if (status_ !== "all") params.set("status", status_);
    if (page_ !== "1") params.set("page", page_);
    const qs = params.toString();
    return `/recruiter${qs ? `?${qs}` : ""}`;
  }

  function handleSearchChange(val: string) {
    setSearchInput(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      startTransition(() => router.push(buildUrl({ q: val, page: "1" })));
    }, 300);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const data = new FormData(e.currentTarget);
    const thresholdRaw = parseInt(data.get("threshold") as string);
    const body = {
      title: data.get("title") as string,
      description,
      location: (data.get("location") as string) || undefined,
      customPrompt: (data.get("customPrompt") as string) || undefined,
      threshold: isNaN(thresholdRaw) ? 75 : thresholdRaw,
    };

    if (!body.description || body.description === "<p></p>") {
      setFormError("Description is required.");
      setIsSubmitting(false);
      return;
    }

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
      setDescription("");
      startTransition(() => router.push(buildUrl({ page: "1" })));
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editState) return;
    setEditError(null);
    setIsEditSubmitting(true);

    if (!editState.description || editState.description === "<p></p>") {
      setEditError("Description is required.");
      setIsEditSubmitting(false);
      return;
    }

    const data = new FormData(e.currentTarget);
    const editThresholdRaw = parseInt(data.get("edit-threshold") as string);
    const body = {
      title: data.get("edit-title") as string,
      description: editState.description,
      location: (data.get("edit-location") as string) || undefined,
      customPrompt: (data.get("edit-customPrompt") as string) || undefined,
      threshold: isNaN(editThresholdRaw) ? editState.threshold : editThresholdRaw,
    };

    try {
      const res = await fetch(`/api/job-listings/${editState.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json();
        setEditError(json.error ?? "Failed to update listing");
        return;
      }

      setEditState(null);
      startTransition(() => router.refresh());
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setIsEditSubmitting(false);
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
            setDescription("");
          }}
        >
          <PlusCircle data-icon="inline-start" />
          {showForm ? "Cancel" : "Add Listing"}
        </Button>
      </div>

      {/* Create form */}
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
                <Label>Description</Label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the role, requirements, and responsibilities…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="jl-customPrompt">AI Weighting Prompt <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <textarea
                  id="jl-customPrompt"
                  name="customPrompt"
                  className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. Prioritize 3+ years of React experience. Penalize lack of testing knowledge."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="jl-threshold">Score Threshold <span className="text-muted-foreground font-normal">(0–100, default 75)</span></Label>
                <Input
                  id="jl-threshold"
                  name="threshold"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="75"
                  className="w-24"
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

      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs w-full">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search listings…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(["all", "active", "inactive"] as const).map((s) => (
            <Button
              key={s}
              variant={status === s ? "default" : "outline"}
              size="sm"
              className="h-8 capitalize"
              onClick={() =>
                startTransition(() =>
                  router.push(buildUrl({ status: s, page: "1" }))
                )
              }
            >
              {s}
            </Button>
          ))}
          <span className="ml-2 text-xs text-muted-foreground whitespace-nowrap">
            {total} {total === 1 ? "listing" : "listings"}
          </span>
        </div>
      </div>

      {/* Listings */}
      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <Briefcase className="size-10 text-muted-foreground" weight="thin" />
            <div>
              <p className="text-sm font-semibold">{q || status !== "all" ? "No results" : "No listings yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {q || status !== "all"
                  ? "Try adjusting your search or filters."
                  : "Create your first job listing to start receiving applications."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => {
            const isEditing = editState?.id === listing.id;
            return (
              <Card key={listing.id} size="sm">
                <CardContent className="flex flex-col gap-3">
                  {isEditing ? (
                    /* ── Edit form ── */
                    <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Edit listing</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditState(null);
                            setEditError(null);
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`edit-title-${listing.id}`}>Title</Label>
                        <Input
                          id={`edit-title-${listing.id}`}
                          name="edit-title"
                          defaultValue={editState.title}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`edit-location-${listing.id}`}>Location</Label>
                        <Input
                          id={`edit-location-${listing.id}`}
                          name="edit-location"
                          defaultValue={editState.location}
                          placeholder="e.g. Remote / Berlin, DE (optional)"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Description</Label>
                        <RichTextEditor
                          value={editState.description}
                          onChange={(html) =>
                            setEditState((s) => s && { ...s, description: html })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`edit-customPrompt-${listing.id}`}>AI Weighting Prompt <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <textarea
                          id={`edit-customPrompt-${listing.id}`}
                          name="edit-customPrompt"
                          defaultValue={editState.customPrompt}
                          className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="e.g. Prioritize React 3+ years…"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`edit-threshold-${listing.id}`}>Score Threshold</Label>
                        <Input
                          id={`edit-threshold-${listing.id}`}
                          name="edit-threshold"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue={editState.threshold}
                          className="w-24"
                        />
                      </div>
                      {editError && (
                        <p className="text-sm text-destructive">{editError}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditState(null);
                            setEditError(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isEditSubmitting}>
                          {isEditSubmitting ? "Saving…" : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    /* ── Read view ── */
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{listing.title}</p>
                          <Badge
                            variant={listing.isActive ? "default" : "secondary"}
                            className="shrink-0 text-xs"
                          >
                            {listing.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {listing.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            {listing.location}
                          </div>
                        )}
                        <div
                          className="prose prose-xs text-muted-foreground line-clamp-2 mt-0.5 **:text-xs **:text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: listing.description }}
                        />
                        <div className="flex items-center gap-3 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            {listing._count.candidates}{" "}
                            {listing._count.candidates === 1 ? "applicant" : "applicants"}
                          </p>
                          <span className="text-xs text-muted-foreground">·</span>
                          <p className="text-xs text-muted-foreground">
                            Threshold: <span className="font-medium text-foreground">{listing.threshold}</span>
                          </p>
                          {listing.customPrompt && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <p className="text-xs text-primary font-medium truncate max-w-50" title={listing.customPrompt}>
                                AI prompt set
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button asChild size="sm">
                          <Link href={`/recruiter/jobs/${listing.id}`}>
                            Applications
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditState({
                              id: listing.id,
                              title: listing.title,
                              location: listing.location ?? "",
                              description: listing.description,
                              customPrompt: listing.customPrompt ?? "",
                              threshold: listing.threshold,
                            });
                            setEditError(null);
                          }}
                        >
                          <PencilSimple data-icon="inline-start" />
                          Edit
                        </Button>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                startTransition(() =>
                  router.push(buildUrl({ page: String(page - 1) }))
                )
              }
            >
              <CaretLeft data-icon="inline-start" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                startTransition(() =>
                  router.push(buildUrl({ page: String(page + 1) }))
                )
              }
            >
              Next
              <CaretRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
