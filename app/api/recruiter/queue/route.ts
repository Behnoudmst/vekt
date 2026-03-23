import { CandidateStatus } from "@/generated/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  const currentUserId = session.user?.id;

  if (!isAdmin && !currentUserId) {
    return NextResponse.json({ error: "Session is stale. Please sign in again." }, { status: 401 });
  }

  const candidates = await prisma.candidate.findMany({
    where: {
      status: CandidateStatus.SHORTLISTED,
      ...(!isAdmin && currentUserId ? { job: { is: { createdById: currentUserId } } } : {}),
    },
    orderBy: [{ evaluation: { score: "desc" } }, { appliedAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      resumePath: true,
      appliedAt: true,
      status: true,
      job: { select: { id: true, title: true } },
      evaluation: {
        select: { score: true, reasoning: true, pros: true, cons: true },
      },
    },
  });

  return NextResponse.json(candidates);
}

