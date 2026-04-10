import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
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

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const currentUserId = session.user?.id;

  if (!isAdmin && !currentUserId) redirect("/login");

  const { jobId } = await params;

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      ...(!isAdmin && currentUserId ? { createdById: currentUserId } : {}),
    },
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
      answers: {
        orderBy: { question: { order: "asc" } },
        select: {
          questionId: true,
          question: { select: { text: true, type: true } },
          option: { select: { text: true } },
        },
      },
    },
  });

  const shortlistedCount = candidates.filter((c) => c.status === "SHORTLISTED").length;

  type Candidate = (typeof candidates)[number];

  const STATUS_GROUPS: {
    key: string;
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    defaultOpen: boolean;
    filter: (c: Candidate) => boolean;
  }[] = [
    {
      key: "accepted",
      label: "Accepted",
      variant: "default",
      defaultOpen: false,
      filter: (c) => c.status === "ACCEPTED",
    },
    {
      key: "shortlisted",
      label: "Shortlisted",
      variant: "default",
      defaultOpen: true,
      filter: (c) => c.status === "SHORTLISTED",
    },
    {
      key: "applied",
      label: "Applied",
      variant: "secondary",
      defaultOpen: false,
      filter: (c) => c.status === "APPLIED" || c.status === "ANALYZING",
    },
    {
      key: "rejected",
      label: "Rejected",
      variant: "destructive",
      defaultOpen: false,
      filter: (c) => c.status === "REJECTED",
    },
  ];

  function CandidateCard({ c, i }: { c: Candidate; i: number }) {
    const pros: string[] = c.evaluation?.pros ? JSON.parse(c.evaluation.pros) : [];
    const cons: string[] = c.evaluation?.cons ? JSON.parse(c.evaluation.cons) : [];

    // Group answers by question (preserves order since query is ordered by question.order)
    const answersByQuestion = c.answers.reduce<
      Map<string, { questionText: string; options: string[] }>
    >((map, a) => {
      if (!map.has(a.questionId)) {
        map.set(a.questionId, { questionText: a.question.text, options: [] });
      }
      map.get(a.questionId)!.options.push(a.option.text);
      return map;
    }, new Map());
    return (
      <Card size="sm">
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
                <p className="font-medium text-sm">{c.name}</p>
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

          {/* Screening answers */}
          {answersByQuestion.size > 0 && (
            <div className="rounded-lg border bg-muted/20 p-3 flex flex-col gap-2.5">
              <p className="text-xs font-semibold text-muted-foreground">Screening Answers</p>
              {Array.from(answersByQuestion.values()).map((q, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <p className="text-xs text-foreground">{q.questionText}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt, oi) => (
                      <span
                        key={oi}
                        className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
            <ReviewButton candidateId={c.id} currentStatus={c.status} />
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <Accordion
            type="multiple"
            defaultValue={STATUS_GROUPS.filter((g) => g.defaultOpen).map((g) => g.key)}
            className="flex flex-col gap-1"
          >
            {STATUS_GROUPS.map((group) => {
              const grouped = candidates.filter(group.filter);
              return (
                <div key={group.key} className="rounded-xl border border-border bg-card">
                  <AccordionItem value={group.key} className="border-none px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{group.label}</span>
                        <Badge variant={grouped.length > 0 ? group.variant : "outline"} className="text-xs tabular-nums">
                          {grouped.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      {grouped.length === 0 ? (
                        <p className="text-xs text-muted-foreground pb-4">No candidates in this group.</p>
                      ) : (
                        <div className="flex flex-col gap-3 pb-4">
                          {grouped.map((c, i) => (
                            <CandidateCard key={c.id} c={c} i={i} />
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </div>
              );
            })}
          </Accordion>
        )}
      </main>
    </div>
  );
}
