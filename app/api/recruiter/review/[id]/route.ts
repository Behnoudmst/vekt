import { CandidateStatus } from "@/generated/client";
import { auth } from "@/lib/auth";
import { sendCandidateEmail } from "@/lib/email";
import { inngest } from "@/lib/inngest";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { reviewDecisionSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const currentUserId = session.user?.id;

  if (!isAdmin && !currentUserId) {
    return NextResponse.json({ error: "Session is stale. Please sign in again." }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json();
  const validation = reviewDecisionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 },
    );
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: {
      id: true,
      job: { select: { createdById: true } },
    },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  if (!isAdmin && candidate.job?.createdById !== currentUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newStatus =
    validation.data.decision === "ACCEPT"
      ? CandidateStatus.ACCEPTED
      : validation.data.decision === "SHORTLIST"
        ? CandidateStatus.SHORTLISTED
        : CandidateStatus.REJECTED;

  const updated = await prisma.candidate.update({
    where: { id },
    data: { status: newStatus },
  });

  logger.info(
    { candidateId: id, decision: validation.data.decision, reviewerId: session.user?.email },
    "API: recruiter review decision recorded",
  );

  // Send candidate email for ACCEPTED, SHORTLISTED, and REJECTED transitions
  const emailTypeMap: Partial<Record<CandidateStatus, "ACCEPTED" | "SHORTLISTED" | "REJECTED">> = {
    [CandidateStatus.ACCEPTED]: "ACCEPTED",
    [CandidateStatus.SHORTLISTED]: "SHORTLISTED",
    [CandidateStatus.REJECTED]: "REJECTED",
  };
  const emailTypeName = emailTypeMap[newStatus];
  if (emailTypeName) {
    const { EmailType } = await import("@/generated/client");
    const inngestConfigured = process.env.INNGEST_EVENT_KEY || process.env.INNGEST_BASE_URL;
    if (inngestConfigured) {
      // Cancel any pending status email for this candidate, then schedule the new one
      // delayed by the configured hours via the sendDelayedStatusEmail Inngest function.
      const delaySetting = await prisma.setting.findUnique({ where: { key: "STATUS_EMAIL_DELAY_HOURS" } });
      const delayHours = delaySetting ? parseInt(delaySetting.value, 10) : 48;

      inngest
        .send([
          { name: "vekt/candidate.status.updated", data: { candidateId: id } },
          {
            name: "vekt/candidate.status.email.scheduled",
            data: { candidateId: id, emailType: EmailType[emailTypeName], delayHours },
          },
        ])
        .catch((err) => logger.warn({ candidateId: id, err }, "API: Inngest send error"));
    } else {
      sendCandidateEmail({ candidateId: id, type: EmailType[emailTypeName] }).catch((err) =>
        logger.warn({ candidateId: id, emailTypeName, err }, "API: review email failed"),
      );
    }
  }

  return NextResponse.json({ id: updated.id, status: updated.status, decision: validation.data.decision });
}

