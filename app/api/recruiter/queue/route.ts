import { CandidateStatus } from "@/generated/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/recruiter/queue:
 *   get:
 *     summary: Get the priority candidate queue
 *     description: Returns candidates with PRIORITY_QUEUE status, sorted by score descending then application date ascending. Requires authentication.
 *     tags:
 *       - Recruiter
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Priority queue candidates
 *       401:
 *         description: Unauthorized
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await prisma.candidate.findMany({
    where: { status: CandidateStatus.PRIORITY_QUEUE },
    orderBy: [{ scoreTotal: "desc" }, { appliedAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      scoreQ1: true,
      scoreQ2: true,
      scoreTotal: true,
      resumePath: true,
      appliedAt: true,
      status: true,
    },
  });

  return NextResponse.json(candidates);
}
