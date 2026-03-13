import { CandidateStatus } from "@/generated/client";
import { evaluateCandidate } from "@/lib/ai";
import { inngest } from "@/lib/inngest";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { meetsThreshold } from "@/lib/scoring";

/** Inngest function: durable AI evaluation pipeline */
export const analyzeCandidate = inngest.createFunction(
  {
    id: "analyze-candidate",
    retries: 5,
  },
  { event: "vekt/candidate.created" },
  async ({ event, step }) => {
    const { candidateId } = event.data as { candidateId: string };

    // Mark as ANALYZING
    await step.run("mark-analyzing", async () => {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: { status: CandidateStatus.ANALYZING },
      });
      logger.info({ candidateId }, "Pipeline: marked ANALYZING");
    });

    // Fetch candidate + job
    const candidate = await step.run("fetch-candidate", async () => {
      return prisma.candidate.findUniqueOrThrow({
        where: { id: candidateId },
        include: { job: true },
      });
    });

    // Run AI evaluation
    const evaluated = await step.run("ai-evaluate", async () => {
      const job = candidate.job;
      const { result, promptSnapshot } = await evaluateCandidate({
        jobTitle: job?.title ?? "General Position",
        jobDescription: job?.description ?? "",
        customPrompt: job?.customPrompt ?? null,
        resumeText: candidate.resumeText,
      });
      return { result, promptSnapshot };
    });

    // Save evaluation & update status
    await step.run("save-evaluation", async () => {
      const { result, promptSnapshot } = evaluated;
      const threshold = candidate.job?.threshold ?? 75;
      const status = meetsThreshold(result.score, threshold)
        ? CandidateStatus.SHORTLISTED
        : CandidateStatus.REJECTED;

      await prisma.$transaction([
        prisma.evaluation.create({
          data: {
            candidateId,
            score: result.score,
            reasoning: result.reasoning,
            pros: JSON.stringify(result.pros),
            cons: JSON.stringify(result.cons),
            promptSnapshot,
          },
        }),
        prisma.candidate.update({
          where: { id: candidateId },
          data: { status },
        }),
      ]);

      logger.info({ candidateId, score: result.score, status }, "Pipeline: evaluation saved");
    });
  },
);

/**
 * Fallback fire-and-forget pipeline for when Inngest is not configured.
 * Used in development without the Inngest Dev Server.
 */
export async function runEvaluationPipelineDirect(candidateId: string): Promise<void> {
  logger.info({ candidateId }, "Pipeline: starting direct evaluation");

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { status: CandidateStatus.ANALYZING },
  });

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { job: true },
  });

  const { result, promptSnapshot } = await evaluateCandidate({
    jobTitle: candidate.job?.title ?? "General Position",
    jobDescription: candidate.job?.description ?? "",
    customPrompt: candidate.job?.customPrompt ?? null,
    resumeText: candidate.resumeText,
  });

  const threshold = candidate.job?.threshold ?? 75;
  const status = meetsThreshold(result.score, threshold)
    ? CandidateStatus.SHORTLISTED
    : CandidateStatus.REJECTED;

  await prisma.$transaction([
    prisma.evaluation.create({
      data: {
        candidateId,
        score: result.score,
        reasoning: result.reasoning,
        pros: JSON.stringify(result.pros),
        cons: JSON.stringify(result.cons),
        promptSnapshot,
      },
    }),
    prisma.candidate.update({
      where: { id: candidateId },
      data: { status },
    }),
  ]);

  logger.info({ candidateId, score: result.score, status }, "Pipeline: direct evaluation complete");
}
