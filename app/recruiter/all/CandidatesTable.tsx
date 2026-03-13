"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ChartBarIcon, CheckIcon, CircleNotchIcon, DotsThreeIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Evaluation = {
  score: number;
  reasoning: string;
  pros: string;
  cons: string;
  promptSnapshot: string;
} | null;

type Candidate = {
  id: string;
  name: string;
  email: string;
  status: string;
  appliedAt: Date;
  job: { id: string; title: string } | null;
  evaluation: Evaluation;
};

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  APPLIED: "outline",
  ANALYZING: "secondary",
  SHORTLISTED: "default",
  ACCEPTED: "outline", // overridden with green classNames below
  REJECTED: "destructive",
};

function parseJson(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function AiAnalysisContent({ evaluation }: { evaluation: Evaluation }) {
  if (!evaluation) return null;
  const pros = parseJson(evaluation.pros);
  const cons = parseJson(evaluation.cons);

  return (
    <>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-4xl font-bold text-primary">{evaluation.score}</span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{evaluation.reasoning}</p>

      {pros.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Strengths</p>
            <ul className="space-y-1">
              {pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckIcon weight="bold" className="size-3.5 text-green-500 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {cons.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Weaknesses</p>
            <ul className="space-y-1">
              {cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XIcon weight="bold" className="size-3.5 text-destructive mt-0.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

function ActionButtons({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const isSettled = candidate.status === "ACCEPTED";

  async function decide(decision: "ACCEPT" | "SHORTLIST" | "REJECT") {
    setOpen(false);
    await fetch(`/api/recruiter/review/${candidate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center justify-end">
      {/* AI Analysis dialog — lives outside the Popover so it isn't unmounted when Popover closes */}
      {candidate.evaluation && (
        <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">AI Analysis — {candidate.name}</DialogTitle>
            </DialogHeader>
            <AiAnalysisContent evaluation={candidate.evaluation} />
          </DialogContent>
        </Dialog>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="size-7" disabled={isPending}>
            {isPending
              ? <CircleNotchIcon className="size-4 animate-spin" />
              : <DotsThreeIcon weight="bold" className="size-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5" align="end">
          <div className="flex flex-col gap-0.5">
            {candidate.evaluation && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start gap-2 text-xs h-8"
                  onClick={() => { setOpen(false); setAnalysisOpen(true); }}
                >
                  <ChartBarIcon className="size-3.5" />
                  View AI Analysis
                </Button>
                {!isSettled && <Separator className="my-1" />}
              </>
            )}

            {!isSettled && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start gap-2 text-xs h-8 text-green-700 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                    >
                      <CheckIcon weight="bold" className="size-3.5" />
                      Accept
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Accept {candidate.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the candidate as hired.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => decide("ACCEPT")}>Accept</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start gap-2 text-xs h-8 text-blue-700 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                    >
                      <ChartBarIcon className="size-3.5" />
                      Shortlist
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Shortlist {candidate.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will move the candidate to the shortlist for further review.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => decide("SHORTLIST")}>Shortlist</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start gap-2 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XIcon weight="bold" className="size-3.5" />
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject {candidate.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will flag the candidate as not suitable.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => decide("REJECT")}
                      >
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Position</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">AI Score</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {c.job ? (
                <span className="text-foreground text-xs font-medium">{c.job.title}</span>
              ) : (
                <span className="text-xs">—</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{c.email}</TableCell>
            <TableCell>
              <Badge
                variant={STATUS_VARIANT[c.status] ?? "outline"}
                className={c.status === "ACCEPTED"
                  ? "text-xs bg-green-500/15 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800"
                  : "text-xs"}
              >
                {c.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              {c.evaluation?.score ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(c.appliedAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <ActionButtons candidate={c} />
            </TableCell>
          </TableRow>
        ))}
        {candidates.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
              No candidates yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
