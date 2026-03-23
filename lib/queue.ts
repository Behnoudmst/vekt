import { CandidateStatus, EmailType } from "@/generated/client";
import { evaluateCandidate } from "@/lib/ai";
import { sendCandidateEmail } from "@/lib/email";
import { inngest } from "@/lib/inngest";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { meetsThreshold } from "@/lib/scoring";
import fs from "fs/promises";
import path from "path";

/** Inngest function: durable AI evaluation pipeline */
export const analyzeCandidate = inngest.createFunction(
  {
    id: "analyze-candidate",
    retries: 5,
  },
  { event: "vekt/candidate.created" },
  async ({ event, step }) => {
    const { candidateId } = event.data as { candidateId: string };

    // Send application confirmation email
    await step.run("send-applied-email", async () => {
      await sendCandidateEmail({ candidateId, type: EmailType.APPLIED });
    });

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

    // Schedule SHORTLISTED or REJECTED notification email, delayed 48 hours.
    // The sendDelayedStatusEmail function will cancel itself if a
    // "vekt/candidate.status.updated" event arrives before the delay elapses.
    const evaluationEmailType = meetsThreshold(evaluated.result.score, candidate.job?.threshold ?? 75)
      ? EmailType.SHORTLISTED
      : EmailType.REJECTED;
    await step.sendEvent("schedule-evaluation-email", {
      name: "vekt/candidate.status.email.scheduled",
      data: { candidateId, emailType: evaluationEmailType },
    });
  },
);

/**
 * Inngest function: sends a status-change email to a candidate after a 48-hour delay.
 *
 * Triggered by "vekt/candidate.status.email.scheduled".
 * Automatically cancelled (via cancelOn) if a "vekt/candidate.status.updated" event
 * arrives for the same candidate before the delay elapses — meaning the recruiter
 * changed the candidate's status in the meantime.
 */
export const sendDelayedStatusEmail = inngest.createFunction(
  {
    id: "send-delayed-status-email",
    cancelOn: [
      {
        event: "vekt/candidate.status.updated",
        match: "data.candidateId",
      },
    ],
  },
  { event: "vekt/candidate.status.email.scheduled" },
  async ({ event, step }) => {
    const { candidateId, emailType } = event.data as { candidateId: string; emailType: EmailType };

    await step.sleep("wait-48-hours", "48 hours");

    await step.run("send-status-email", async () => {
      await sendCandidateEmail({ candidateId, type: emailType });
    });
  },
);

/** Inngest cron function: delete candidate records (+ resume files) past the retention window */
export const purgeExpiredCandidates = inngest.createFunction(
  { id: "purge-expired-candidates" },
  { cron: "0 2 * * *" }, // runs daily at 02:00 UTC
  async ({ step }) => {
    const setting = await step.run("read-retention-setting", async () => {
      return prisma.setting.findUnique({ where: { key: "RETENTION_DAYS" } });
    });

    const retentionDays = setting ? parseInt(setting.value, 10) : 90;
    if (isNaN(retentionDays) || retentionDays <= 0) {
      logger.warn({ retentionDays: setting?.value }, "Purge: invalid RETENTION_DAYS, skipping");
      return { deleted: 0 };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const expired = await step.run("fetch-expired-candidates", async () => {
      return prisma.candidate.findMany({
        where: { appliedAt: { lt: cutoff } },
        select: { id: true, resumePath: true },
      });
    });

    if (expired.length === 0) {
      logger.info({ retentionDays, cutoff }, "Purge: no expired candidates");
      return { deleted: 0 };
    }

    // Send GDPR data retention warning to candidates expiring in ≤7 days
    await step.run("send-retention-warnings", async () => {
      if (retentionDays < 7) return { warned: 0 };

      const warnCutoff = new Date();
      warnCutoff.setDate(warnCutoff.getDate() - (retentionDays - 7));

      const aboutToExpire = await prisma.candidate.findMany({
        where: { appliedAt: { gte: cutoff, lt: warnCutoff } },
        select: {
          id: true,
          emailLogs: { where: { type: EmailType.DATA_RETENTION_WARNING }, select: { id: true } },
        },
      });

      let warned = 0;
      for (const c of aboutToExpire) {
        if (c.emailLogs.length > 0) continue; // warning already sent
        await sendCandidateEmail({ candidateId: c.id, type: EmailType.DATA_RETENTION_WARNING });
        warned++;
      }

      logger.info({ warned, total: aboutToExpire.length }, "Purge: sent retention warnings");
      return { warned };
    });

    // Delete resume files from disk
    await step.run("delete-resume-files", async () => {
      const uploadsDir = path.join(process.cwd(), "private", "uploads");
      for (const candidate of expired) {
        const filename = path.basename(candidate.resumePath);
        // Only delete UUIDs (guard against unexpected paths)
        if (/^[a-f0-9-]{36}\.pdf$/i.test(filename)) {
          await fs.unlink(path.join(uploadsDir, filename)).catch(() => {
            // File already gone — not an error
          });
        }
      }
    });

    // Delete candidate records (Evaluation cascades automatically)
    const { count } = await step.run("delete-candidate-records", async () => {
      return prisma.candidate.deleteMany({
        where: { id: { in: expired.map((c) => c.id) } },
      });
    });

    logger.info({ deleted: count, retentionDays, cutoff }, "Purge: completed");
    return { deleted: count };
  },
);

/**
 * Fallback fire-and-forget pipeline for when Inngest is not configured.
 * Used in development without the Inngest Dev Server.
 */
export async function runEvaluationPipelineDirect(candidateId: string): Promise<void> {
  logger.info({ candidateId }, "Pipeline: starting direct evaluation");

  // Send APPLIED confirmation email (best effort)
  sendCandidateEmail({ candidateId, type: EmailType.APPLIED }).catch((err) =>
    logger.warn({ candidateId, err }, "Pipeline: applied email failed"),
  );

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

  // Send SHORTLISTED or REJECTED notification email (best effort)
  const emailType = status === CandidateStatus.SHORTLISTED ? EmailType.SHORTLISTED : EmailType.REJECTED;
  sendCandidateEmail({ candidateId, type: emailType }).catch((err) =>
    logger.warn({ candidateId, emailType, err }, "Pipeline: evaluation email failed"),
  );
}
