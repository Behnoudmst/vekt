"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  CheckCircle,
  MapPin,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

type ScreeningOption = { id: string; text: string };
type ScreeningQuestion = {
  id: string;
  text: string;
  type: "SINGLE" | "MULTIPLE";
  options: ScreeningOption[];
};

type Job = {
  id: string;
  title: string;
  description: string;
  location: string | null;
  screeningQuestions: ScreeningQuestion[];
};

type Props = {
  job?: Job | null;
};

type SubmissionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; statusPath: string }
  | { status: "error"; message: string };

const supportEmail = process.env.SUPPORT_EMAIL || "example-support@email.com";

function StepDot({ active, done }: { active?: boolean; done?: boolean }) {
  return (
    <div
      className={cn(
        "size-2 rounded-full transition-colors",
        done
          ? "bg-primary"
          : active
            ? "ring-2 ring-primary ring-offset-1 bg-primary"
            : "bg-muted-foreground/30",
      )}
    />
  );
}

export default function ApplyForm({ job }: Props) {
  const hasQuestions = (job?.screeningQuestions?.length ?? 0) > 0;

  const [step, setStep] = useState<"details" | "questions">("details");
  const [state, setState] = useState<SubmissionState>({ status: "idle" });
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  // answers: questionId → Set of selected optionIds
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});

  // hold step-1 values so we can re-populate after going back
  const [detailsSnapshot, setDetailsSnapshot] = useState<{
    name: string;
    email: string;
    resume: File | null;
  }>({ name: "", email: "", resume: null });

  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleOption(question: ScreeningQuestion, optionId: string) {
    setAnswers((prev) => {
      const current = new Set(prev[question.id] ?? []);
      if (question.type === "SINGLE") {
        return { ...prev, [question.id]: new Set([optionId]) };
      }
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }
      return { ...prev, [question.id]: current };
    });
  }

  function handleNextStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const resumeFile = fileInputRef.current?.files?.[0] ?? null;

    if (!resumeFile || resumeFile.type !== "application/pdf") {
      toast.error("Please upload a PDF resume.");
      return;
    }
    if (name.length > 30 || email.length > 30) {
      toast.error("Name and email must be under 30 characters.");
      return;
    }

    setDetailsSnapshot({ name, email, resume: resumeFile });
    setStep("questions");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "loading" });

    const formData = new FormData();

    if (hasQuestions) {
      // Values were captured in detailsSnapshot at step 1
      formData.append("name", detailsSnapshot.name);
      formData.append("email", detailsSnapshot.email);
      if (detailsSnapshot.resume) {
        formData.append("resume", detailsSnapshot.resume);
      }
    } else {
      // Single-step: read straight from the form
      const raw = new FormData(e.currentTarget);
      const resumeFile = raw.get("resume") as File | null;
      if (!resumeFile || resumeFile.type !== "application/pdf") {
        toast.error("Please upload a PDF resume.");
        setState({ status: "idle" });
        return;
      }
      const name = raw.get("name") as string;
      const email = raw.get("email") as string;
      if (name.length > 30 || email.length > 30) {
        toast.error("Name and email must be under 30 characters.");
        setState({ status: "idle" });
        return;
      }
      formData.append("name", name);
      formData.append("email", email);
      formData.append("resume", resumeFile);
    }

    if (job) {
      formData.append("jobId", job.id);
    }
    formData.append("consentGiven", "true");

    if (hasQuestions) {
      const answersPayload = Object.entries(answers).map(([qId, optSet]) => ({
        questionId: qId,
        optionIds: Array.from(optSet),
      }));
      formData.append("answers", JSON.stringify(answersPayload));
    }

    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "Submission failed. Please try again.",
        });
        return;
      }

      setState({ status: "success", statusPath: data.statusPath });
      formRef.current?.reset();
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  return (
    <div className="flex min-h-[89vh] flex-col bg-background">
      <main className="flex-1">
        {/* Layout: single col mobile, 2-col desktop when job present */}
        <div
          className={
            job
              ? "mx-auto grid max-w-5xl gap-8 p-6 md:grid-cols-[1fr_400px] md:items-start"
              : "mx-auto flex max-w-md flex-col p-6"
          }
        >
          {/* Left: job description */}
          {job && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="size-5 text-primary" weight="fill" />
                <h1 className="text-xl font-semibold">{job.title}</h1>
              </div>
              {job.location && (
                <div className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  {job.location}
                </div>
              )}
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </div>
          )}

          {/* Right: form */}
          <div className="md:sticky md:top-20">
            {state.status === "success" ? (
              /* ── Success state ── */
              <Card>
                <CardHeader>
                  <CheckCircle className="size-8 text-primary" weight="fill" />
                  <CardTitle>Application Submitted!</CardTitle>
                  <CardDescription>
                    Your application is being evaluated by our AI engine.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-muted-foreground text-xs">
                    Track your application status using your private status page:
                  </p>
                  <Link
                    href={state.statusPath}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-3"
                  >
                    View Status
                  </Link>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setState({ status: "idle" });
                      setStep("details");
                      setAnswers({});
                      setConsentPrivacy(false);
                      setConsentTerms(false);
                    }}
                  >
                    Submit another application
                  </Button>
                </CardFooter>
              </Card>
            ) : step === "details" || !hasQuestions ? (
              /* ── Step 1: Details ── */
              <Card>
                <CardHeader>
                  <CardTitle>Apply Now</CardTitle>
                  <CardDescription>
                    {job
                      ? `Applying for: ${job.title}`
                      : "Submit your application and our AI engine will evaluate your profile."}
                  </CardDescription>
                  {hasQuestions && (
                    <div className="flex items-center gap-2 pt-1">
                      <StepDot active />
                      <div className="h-px w-6 bg-border" />
                      <StepDot />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <form
                    ref={formRef}
                    onSubmit={hasQuestions ? handleNextStep : handleSubmit}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        type="text"
                        maxLength={30}
                        required
                        placeholder="Jane Doe"
                        defaultValue={detailsSnapshot.name}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        maxLength={30}
                        type="email"
                        required
                        placeholder="jane@example.com"
                        defaultValue={detailsSnapshot.email}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="resume">Resume</Label>
                      <Input
                        ref={fileInputRef}
                        id="resume"
                        name="resume"
                        type="file"
                        accept="application/pdf"
                        required
                      />
                      <p className="text-xs text-muted-foreground">PDF only</p>
                    </div>

                    {!hasQuestions && state.status === "error" && (
                      <Alert variant="destructive">
                        <WarningCircle />
                        <AlertTitle>Submission failed</AlertTitle>
                        <AlertDescription>{state.message}</AlertDescription>
                      </Alert>
                    )}

                    {/* GDPR consent (single-step only) */}
                    {!hasQuestions && (
                      <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="consentPrivacy"
                            checked={consentPrivacy}
                            onChange={(e) => setConsentPrivacy(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                          />
                          <label
                            htmlFor="consentPrivacy"
                            className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                          >
                            I have read and agree to the{" "}
                            <Link
                              href="/privacy"
                              target="_blank"
                              className="text-primary underline underline-offset-3 font-medium"
                            >
                              Privacy Policy
                            </Link>{" "}
                            and consent to my personal data being processed for
                            recruitment purposes.
                          </label>
                        </div>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id="consentTerms"
                            checked={consentTerms}
                            onChange={(e) => setConsentTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                          />
                          <label
                            htmlFor="consentTerms"
                            className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                          >
                            I understand my data will be retained for up to 12
                            months and I may contact{" "}
                            <a
                              href={`mailto:${supportEmail}`}
                              className="text-primary underline underline-offset-3 font-medium"
                            >
                              {supportEmail}
                            </a>{" "}
                            to access, correct, or delete my data at any time.
                          </label>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={
                        state.status === "loading" ||
                        (!hasQuestions && (!consentPrivacy || !consentTerms))
                      }
                      className="w-full"
                    >
                      {state.status === "loading" && !hasQuestions && (
                        <SpinnerGap
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      )}
                      {hasQuestions
                        ? "Next →"
                        : state.status === "loading"
                          ? "Submitting…"
                          : "Submit Application"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              /* ── Step 2: Screening Questions ── */
              <Card>
                <CardHeader>
                  <CardTitle>Screening Questions</CardTitle>
                  <CardDescription>
                    Please answer the following questions for this role.
                  </CardDescription>
                  <div className="flex items-center gap-2 pt-1">
                    <StepDot done />
                    <div className="h-px w-6 bg-primary/40" />
                    <StepDot active />
                  </div>
                </CardHeader>
                <CardContent>
                  <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6"
                  >
                    {job!.screeningQuestions.map((q) => (
                      <div key={q.id} className="flex flex-col gap-3">
                        <div>
                          <p className="text-sm font-medium leading-snug">
                            {q.text}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {q.type === "SINGLE"
                              ? "Select one"
                              : "Select all that apply"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => {
                            const selected = answers[q.id]?.has(opt.id) ?? false;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => toggleOption(q, opt.id)}
                                className={cn(
                                  "rounded-lg border px-3.5 py-2 text-sm font-medium transition-all text-left",
                                  selected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background text-foreground hover:border-foreground/40",
                                )}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {state.status === "error" && (
                      <Alert variant="destructive">
                        <WarningCircle />
                        <AlertTitle>Submission failed</AlertTitle>
                        <AlertDescription>{state.message}</AlertDescription>
                      </Alert>
                    )}

                    {/* GDPR consent */}
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="consentPrivacy2"
                          checked={consentPrivacy}
                          onChange={(e) => setConsentPrivacy(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                        />
                        <label
                          htmlFor="consentPrivacy2"
                          className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                        >
                          I have read and agree to the{" "}
                          <Link
                            href="/privacy"
                            target="_blank"
                            className="text-primary underline underline-offset-3 font-medium"
                          >
                            Privacy Policy
                          </Link>{" "}
                          and consent to my personal data being processed for
                          recruitment purposes.
                        </label>
                      </div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="consentTerms2"
                          checked={consentTerms}
                          onChange={(e) => setConsentTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                        />
                        <label
                          htmlFor="consentTerms2"
                          className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                        >
                          I understand my data will be retained for up to 12
                          months and I may contact{" "}
                          <a
                            href={`mailto:${supportEmail}`}
                            className="text-primary underline underline-offset-3 font-medium"
                          >
                            {supportEmail}
                          </a>{" "}
                          to access, correct, or delete my data at any time.
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep("details")}
                        disabled={state.status === "loading"}
                      >
                        ← Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={
                          state.status === "loading" ||
                          !consentPrivacy ||
                          !consentTerms
                        }
                      >
                        {state.status === "loading" && (
                          <SpinnerGap
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        )}
                        {state.status === "loading"
                          ? "Submitting…"
                          : "Submit Application"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
