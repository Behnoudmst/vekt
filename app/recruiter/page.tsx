import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CandidateStatus } from "@/generated/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    ArrowRight,
    FilePdf,
    Lightning,
    Tray,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import JobListingsSection from "./JobListingsSection";
import ReviewButton from "./ReviewButton";
import SignOutButton from "./SignOutButton";

export default async function RecruiterPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const candidates = await prisma.candidate.findMany({
    where: { status: CandidateStatus.PRIORITY_QUEUE },
    orderBy: [{ scoreTotal: "desc" }, { appliedAt: "asc" }],
  });

  const jobListings = await prisma.jobListing.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      isActive: true,
      createdAt: true,
      _count: { select: { candidates: true } },
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightning weight="fill" className="size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold leading-tight">Spark-Hire</p>
            <p className="text-xs text-muted-foreground leading-tight">
              Recruiter Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {session.user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        {/* Job Listings section */}
        <JobListingsSection listings={jobListings} />

        <Separator className="my-8" />

        {/* Section header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Priority Queue</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidates with a total score &ge; 75 — sorted by score (highest
              first)
            </p>
          </div>
          <Badge variant="secondary" className="mt-0.5 shrink-0">
            {candidates.length}{" "}
            {candidates.length === 1 ? "candidate" : "candidates"}
          </Badge>
        </div>

        {candidates.length === 0 ? (
          <Card className="items-center py-16">
            <Tray className="size-10 text-muted-foreground" weight="thin" />
            <CardHeader className="items-center text-center">
              <CardTitle>No candidates yet</CardTitle>
              <CardDescription>
                Submit applications via the{" "}
                <Link href="/apply" className="text-primary underline underline-offset-3">
                  apply page
                </Link>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {candidates.map((c, i) => (
              <Card key={c.id} size="sm">
                <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Rank + info */}
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="size-7 shrink-0 justify-center text-xs font-bold">
                      {i + 1}
                    </Badge>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-medium text-sm text-foreground">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied{" "}
                        {new Date(c.appliedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex gap-5">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Q1 (40%)</p>
                      <p className="text-sm font-medium">
                        {c.scoreQ1?.toFixed(1) ?? "—"}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-8 self-center" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Q2 (60%)</p>
                      <p className="text-sm font-medium">
                        {c.scoreQ2?.toFixed(1) ?? "—"}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-8 self-center" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p
                        className={`text-base font-bold ${
                          (c.scoreTotal ?? 0) >= 90
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {c.scoreTotal?.toFixed(1) ?? "—"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={c.resumePath}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FilePdf data-icon="inline-start" />
                        Resume
                      </a>
                    </Button>
                    <ReviewButton candidateId={c.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator className="my-8" />
        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/recruiter/all">
              View all candidates
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
