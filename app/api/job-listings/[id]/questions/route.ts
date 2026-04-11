import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1).max(100),
});

const questionSchema = z.object({
  text: z.string().min(1).max(500),
  type: z.enum(["SINGLE", "MULTIPLE"]),
  options: z.array(optionSchema).min(2).max(10),
});

const putBodySchema = z.object({
  questions: z.array(questionSchema).max(20),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Only return questions for active jobs — prevents enumeration of
  // closed/archived job screening criteria by external parties.
  const job = await prisma.job.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!job || !job.isActive) {
    return NextResponse.json({ questions: [] });
  }

  const questions = await prisma.screeningQuestion.findMany({
    where: { jobId: id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      text: true,
      type: true,
      order: true,
      options: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, order: true },
      },
    },
  });

  return NextResponse.json({ questions });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin && job.createdById !== session.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Prevent destructive re-creation if candidates have already submitted answers:
  // deleting ScreeningQuestion rows cascades to CandidateAnswer rows, which
  // would destroy historical candidate response data.
  const existingAnswerCount = await prisma.candidateAnswer.count({
    where: { question: { jobId: id } },
  });
  if (existingAnswerCount > 0) {
    return NextResponse.json(
      {
        error:
          "Questions cannot be edited after candidates have submitted answers. Editing would permanently delete their responses.",
      },
      { status: 409 },
    );
  }

  // Replace all questions atomically
  await prisma.$transaction(async (tx) => {
    await tx.screeningQuestion.deleteMany({ where: { jobId: id } });

    for (let qi = 0; qi < parsed.data.questions.length; qi++) {
      const q = parsed.data.questions[qi];
      await tx.screeningQuestion.create({
        data: {
          jobId: id,
          text: q.text,
          type: q.type,
          order: qi,
          options: {
            create: q.options.map((opt, oi) => ({
              text: opt.text,
              order: oi,
            })),
          },
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
