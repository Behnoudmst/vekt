import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { verifyStatusToken } from "@/lib/public-tokens";
import {
    CheckCircleIcon,
    ClockIcon,
    HourglassMediumIcon,
    SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: token } = await params;
  const candidateId = verifyStatusToken(token);

  if (!candidateId) return notFound();

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      name: true,
      status: true,
      appliedAt: true,
      job: { select: { title: true } },
      evaluation: { select: { score: true, reasoning: true } },
    },
  });

  if (!candidate) return notFound();

  const statusConfig = {
    APPLIED: {
      label: "Application Received",
      description: "Your application has been received and is in the queue for review.",
      icon: <ClockIcon className="size-8 text-muted-foreground" weight="fill" />,
      variant: "secondary" as const,
    },
    ANALYZING: {
      label: "Under Review",
      description: "Our AI engine is analysing your application. This usually takes under a minute.",
      icon: <HourglassMediumIcon className="size-8 text-blue-500" weight="fill" />,
      variant: "outline" as const,
    },
    SHORTLISTED: {
      label: "Shortlisted!",
      description: "Great news — your application has been shortlisted and a recruiter will be in touch soon.",
      icon: <SparkleIcon className="size-8 text-primary" weight="fill" />,
      variant: "default" as const,
    },
    ACCEPTED: {
      label: "Accepted!",
      description: "Congratulations! A recruiter has accepted your application and will be in contact with you shortly.",
      icon: <CheckCircleIcon className="size-8 text-green-500" weight="fill" />,
      variant: "default" as const,
    },
    REJECTED: {
      label: "Under Consideration",
      description: "Thank you for your application. We're keeping your profile on file for future opportunities.",
      icon: <CheckCircleIcon className="size-8 text-muted-foreground" weight="fill" />,
      variant: "secondary" as const,
    },
  } as const;

  const config = statusConfig[candidate.status as keyof typeof statusConfig] ?? {
    label: "In Progress",
    description: "Your application is being processed.",
    icon: <ClockIcon className="size-8 text-muted-foreground" />,
    variant: "secondary" as const,
  };

  return (
    <div className="flex min-h-[89vh] items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">{config.icon}</div>
            <CardTitle>{config.label}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg bg-muted/40 border p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Applicant</span>
                <span className="text-xs font-medium">{candidate.name}</span>
              </div>
              {candidate.job && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Position</span>
                  <span className="text-xs font-medium">{candidate.job.title}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Applied</span>
                <span className="text-xs font-medium">
                  {new Date(candidate.appliedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant={config.variant} className="text-xs">
                  {config.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
