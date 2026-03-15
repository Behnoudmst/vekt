import { CandidateStatus } from "@/generated/client";
import { auth } from "@/lib/auth";
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

  const { id } = await params;

  const body = await req.json();
  const validation = reviewDecisionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 },
    );
  }

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
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

  return NextResponse.json({ id: updated.id, status: updated.status, decision: validation.data.decision });
}

