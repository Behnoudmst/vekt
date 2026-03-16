"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, SpinnerGap, XCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CandidateStatus = "APPLIED" | "ANALYZING" | "SHORTLISTED" | "ACCEPTED" | "REJECTED";

const STATUS_META: Record<CandidateStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  APPLIED: { label: "Applied", variant: "outline" },
  ANALYZING: { label: "Analyzing", variant: "secondary" },
  SHORTLISTED: { label: "Shortlisted", variant: "default" },
  ACCEPTED: { label: "Accepted", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function ReviewButton({
  candidateId,
  currentStatus,
}: {
  candidateId: string;
  currentStatus: CandidateStatus;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function decide(decision: "ACCEPT" | "SHORTLIST" | "REJECT") {
    try {
      setLoading(true);
      await fetch(`/api/recruiter/review/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={loading}>
          {loading ? (
            <SpinnerGap data-icon="inline-start" className="animate-spin" />
          ) : null}
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Review Application</DialogTitle>
          <DialogDescription>
            Select a new status for this candidate.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg flex justify-between items-center border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">Current status</p>
          <Badge variant={STATUS_META[currentStatus].variant} className="text-xs">
            {STATUS_META[currentStatus].label}
          </Badge>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {currentStatus !== "REJECTED" && (
            <Button
              onClick={() => decide("REJECT")}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              <XCircle data-icon="inline-start" />
              Reject
            </Button>
          )}
          {currentStatus !== "SHORTLISTED" && (
            <Button
              onClick={() => decide("SHORTLIST")}
              className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20"
            >
              Shortlist
            </Button>
          )}
          {currentStatus !== "ACCEPTED" && (
            <Button onClick={() => decide("ACCEPT")}>
              <CheckCircle data-icon="inline-start" />
              Accept
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
