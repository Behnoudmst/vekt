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
import { Button } from "@/components/ui/button";
import { CheckCircle, SpinnerGap, XCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewButton({ candidateId }: { candidateId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function decide(decision: "ACCEPT" | "SHORTLIST" | "REJECT") {
    setLoading(true);
    await fetch(`/api/recruiter/review/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={loading}>
          {loading ? (
            <SpinnerGap data-icon="inline-start" className="animate-spin" />
          ) : null}
          Review
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Make a decision</AlertDialogTitle>
          <AlertDialogDescription>
            Choose to hire or reject this candidate. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => decide("REJECT")}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            <XCircle data-icon="inline-start" />
            Reject
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => decide("SHORTLIST")}
            className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20"
          >
            Shortlist
          </AlertDialogAction>
          <AlertDialogAction onClick={() => decide("ACCEPT")}>
            <CheckCircle data-icon="inline-start" />
            Accept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
