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
import {
    Briefcase,
    CheckCircle,
    MapPin,
    SpinnerGap,
    WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRef, useState } from "react";

type Job = {
  id: string;
  title: string;
  description: string;
  location: string | null;
};

type Props = {
  job?: Job | null;
};

type SubmissionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; candidateId: string }
  | { status: "error"; message: string };

export default function ApplyForm({ job }: Props) {
  const [state, setState] = useState<SubmissionState>({ status: "idle" });
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "loading" });

    const formData = new FormData(e.currentTarget);
    if (job) {
      formData.append("jobId", job.id);
    }
    formData.append("consentGiven", "true");

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

      setState({ status: "success", candidateId: data.id });
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
                  Track your application status using your candidate ID:
                </p>
                <Link
                  href={`/status/${state.candidateId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-3"
                >
                  <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">
                    {state.candidateId}
                  </code>
                  → View Status
                </Link>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setState({ status: "idle" })}
                >
                  Submit another application
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Apply Now</CardTitle>
                <CardDescription>
                  {job
                    ? `Applying for: ${job.title}`
                    : "Submit your application and our AI engine will evaluate your profile."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="jane@example.com"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="resume">Resume</Label>
                    <Input
                      id="resume"
                      name="resume"
                      type="file"
                      accept="application/pdf"
                      required
                    />
                    <p className="text-xs text-muted-foreground">PDF only</p>
                  </div>

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
                        id="consentPrivacy"
                        checked={consentPrivacy}
                        onChange={(e) => setConsentPrivacy(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                      />
                      <label htmlFor="consentPrivacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I have read and agree to the{" "}
                        <Link href="/privacy" target="_blank" className="text-primary underline underline-offset-3 font-medium">
                          Privacy Policy
                        </Link>
                        {" "}and consent to my personal data being processed for recruitment purposes.
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
                      <label htmlFor="consentTerms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I understand my data will be retained for up to 12 months and I may contact{" "}
                        <a href="mailto:privacy@vekt.io" className="text-primary underline underline-offset-3 font-medium">
                          privacy@vekt.io
                        </a>
                        {" "}to access, correct, or delete my data at any time.
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={state.status === "loading" || !consentPrivacy || !consentTerms}
                    className="w-full"
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
