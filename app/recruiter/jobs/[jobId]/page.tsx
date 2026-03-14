import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    FilePdf,
    Tray,
} from "@phosphor-icons/react/dist/ssr";
import { notFound, redirect } from "next/navigation";
import ReviewButton from "../../ReviewButton";

export default async function JobApplicationsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, location: true, isActive: true, threshold: true },
  });

  if (!job) notFound();

  const candidates = await prisma.candidate.findMany({
    where: { jobId },
    orderBy: [{ evaluation: { score: "desc" } }, { appliedAt: "asc" }],
    include: {
      evaluation: {
        select: { score: true, reasoning: true, pros: true, cons: true },
      },
    },
  });

  const shortlistedCount = candidates.filter((c) => c.status === "SHORTLISTED").length;

  return (
    <div className="min-h-[89vh] bg-background">
      <main className="mx-auto max-w-4xl p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold">{job.title}</h1>
            <Badge variant={job.isActive ? "default" : "secondary"} className="text-xs">
              {job.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {job.location && (
            <p className="text-xs text-muted-foreground">{job.location}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Score threshold{" "}
            <span className="font-medium text-foreground">{job.threshold}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="mb-4 flex items-center gap-3">
          <p className="text-sm font-medium">
            {candidates.length}{" "}
            {candidates.length === 1 ? "applicant" : "applicants"}
          </p>
          {shortlistedCount > 0 && (
            <>
              <span className="text-muted-foreground text-xs">·</span>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{shortlistedCount}</span> shortlisted
              </p>
            </>
          )}
        </div>

        {candidates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <Tray className="size-10 text-muted-foreground" weight="thin" />
              <div>
                <p className="text-sm font-semibold">No applications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Candidates will appear here once they apply.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {candidates.map((c, i) => {
              const pros: string[] = c.evaluation?.pros ? JSON.parse(c.evaluation.pros) : [];
              const cons: string[] = c.evaluation?.cons ? JSON.parse(c.evaluation.cons) : [];
              const isShortlisted = c.status === "SHORTLISTED";
              return (
                <Card key={c.id} size="sm">
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Rank + info */}
                      <div className="flex items-start gap-3">
                        <Badge
                          variant="outline"
                          className="size-7 shrink-0 justify-center text-xs font-bold"
                        >
                          {i + 1}
                        </Badge>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{c.name}</p>
                            {isShortlisted && (
                              <Badge className="text-xs h-4.5 px-1.5">Shortlisted</Badge>
                            )}
                          </div>
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

                      {/* AI Score */}
                      {c.evaluation ? (
                        <div className="text-center shrink-0">
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
                      ) : (
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground">AI Score</p>
                          <p className="text-sm text-muted-foreground mt-1">—</p>
                        </div>
                      )}
                    </div>

                    {/* AI evaluation */}
                    {c.evaluation && (
                      <div className="rounded-lg bg-muted/40 border p-3 flex flex-col gap-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {c.evaluation.reasoning}
                        </p>
                        {(pros.length > 0 || cons.length > 0) && (
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
                                  {cons.map((con, idx) => (
                                    <li key={idx} className="text-xs text-muted-foreground">
                                      − {con}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
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
      </main>
    </div>
  );
}
