import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CandidateStatus } from "@/generated/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    ArrowRight,
    FilePdf,
    Tray,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import JobListingsSection from "./JobListingsSection";
import ReviewButton from "./ReviewButton";

const PAGE_SIZE = 10;

export default async function RecruiterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const listingStatus = (sp.status ?? "all") as "all" | "active" | "inactive";
  const listingPage = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const listingWhere = {
    ...(q
      ? { OR: [{ title: { contains: q } }, { location: { contains: q } }] }
      : {}),
    ...(listingStatus === "active"
      ? { isActive: true }
      : listingStatus === "inactive"
        ? { isActive: false }
        : {}),
  };

  const [candidates, jobs, listingTotal] = await Promise.all([
    prisma.candidate.findMany({
      where: { status: CandidateStatus.SHORTLISTED },
      orderBy: [{ evaluation: { score: "desc" } }, { appliedAt: "asc" }],
      include: {
        job: { select: { id: true, title: true } },
        evaluation: { select: { score: true, reasoning: true, pros: true, cons: true } },
      },
    }),
    prisma.job.findMany({
      where: listingWhere,
      orderBy: { createdAt: "desc" },
      skip: (listingPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        customPrompt: true,
        threshold: true,
        isActive: true,
        createdAt: true,
        _count: { select: { candidates: true } },
      },
    }),
    prisma.job.count({ where: listingWhere }),
  ]);

  const listingTotalPages = Math.max(1, Math.ceil(listingTotal / PAGE_SIZE));

  return (
    <div className="min-h-[89vh] bg-background">
      
      <main className="mx-auto max-w-4xl p-6">
        {/* Job Listings section */}
        <JobListingsSection
          listings={jobs}
          total={listingTotal}
          page={listingPage}
          totalPages={listingTotalPages}
          q={q}
          status={listingStatus}
        />

        <Separator className="my-8" />

        {/* Section header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Shortlisted Candidates</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Candidates that met the score threshold — sorted highest first
            </p>
          </div>
          <Badge variant="secondary" className="mt-0.5 shrink-0">
            {candidates.length}{" "}
            {candidates.length === 1 ? "candidate" : "candidates"}
          </Badge>
        </div>

        {candidates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <Tray className="size-10 text-muted-foreground" weight="thin" />
              <div>
                <p className="text-sm font-semibold">No candidates yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Submit applications via the{" "}
                  <Link href="/apply" className="text-primary underline underline-offset-3">
                    apply page
                  </Link>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {candidates.map((c, i) => {
              const pros: string[] = c.evaluation?.pros ? JSON.parse(c.evaluation.pros) : [];
              const cons: string[] = c.evaluation?.cons ? JSON.parse(c.evaluation.cons) : [];
              return (
                <Card key={c.id} size="sm">
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Rank + info */}
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="size-7 shrink-0 justify-center text-xs font-bold">
                          {i + 1}
                        </Badge>
                        <div className="flex flex-col gap-0.5">
                          <p className="font-medium text-sm text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                          {c.job && (
                            <p className="text-xs text-primary font-medium">{c.job.title}</p>
                          )}
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

                      {/* AI Score */}
                      {c.evaluation && (
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground">AI Score</p>
                            <p
                              className={`text-2xl font-bold tabular-nums ${
                                c.evaluation.score >= 90
                                  ? "text-primary"
                                  : c.evaluation.score >= 75
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                              }`}
                            >
                              {c.evaluation.score}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI evaluation details */}
                    {c.evaluation && (
                      <div className="rounded-lg bg-muted/40 border p-3 flex flex-col gap-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {c.evaluation.reasoning}
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          {pros.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-green-600 mb-1">Pros</p>
                              <ul className="flex flex-col gap-0.5">
                                {pros.map((p, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground">
                                    + {p}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {cons.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-red-500 mb-1">Cons</p>
                              <ul className="flex flex-col gap-0.5">
                                {cons.map((c, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground">
                                    − {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={c.resumePath} target="_blank" rel="noopener noreferrer">
                          <FilePdf data-icon="inline-start" />
                          Resume
                        </a>
                      </Button>
                      <ReviewButton candidateId={c.id} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

