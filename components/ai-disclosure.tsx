import Link from "next/link";

/**
 * Candidate-facing disclosure that an AI system is involved in the process.
 *
 * EU AI Act Article 50 transparency duties took effect on 2 August 2026 and
 * apply based on what a system does, not on its risk tier — so this text is
 * required now, independently of the December 2027 high-risk deadline. It has
 * to be visible before the candidate submits, not buried in the privacy policy.
 *
 * Deployers: keep the four facts below. What the system does, that a human
 * decides, what data it sees, and how to ask for a human explanation.
 */
export function AiDisclosure({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
      <span
        aria-hidden
        className="mt-0.5 size-2 shrink-0 rounded-full bg-muted-foreground/60"
      />
      <div className="text-xs text-muted-foreground leading-relaxed">
        <p className="font-medium text-foreground">
          This application is assessed with the help of an AI system.
        </p>
        {!compact && (
          <p className="mt-1">
            Your CV is scored automatically against the requirements in this job
            posting to help a recruiter prioritise applications. Direct
            identifiers such as your name, email address and phone number are
            removed before the text is assessed. A person reviews the result and
            makes the decision.
          </p>
        )}
        <p className="mt-1">
          You can ask for an explanation of the assessment or for a review by a
          person at any time — see the{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="text-primary underline underline-offset-3 font-medium"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
