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

    // Log inside a durable step so it runs once even when Inngest replays the function body.
    await step.run("log-pipeline-start", async () => {
      logger.info({ candidateId }, "Pipeline: analyzeCandidate started");
    });

    // Send application confirmation email (best-effort — does not block evaluation)
    await step.run("send-applied-email", async () => {
      try {
        await sendCandidateEmail({ candidateId, type: EmailType.APPLIED });
      } catch (error) {
        logger.warn({ candidateId, step: "send-applied-email", error }, "Pipeline: applied email failed — continuing evaluation");
      }
    });

    // Mark as ANALYZING
    await step.run("mark-analyzing", async () => {
      try {
        await prisma.candidate.update({
          where: { id: candidateId },
          data: { status: CandidateStatus.ANALYZING },
        });
      } catch (error) {
        logger.error({ candidateId, step: "mark-analyzing", error }, "Pipeline: step failed");
        throw error;
      }
    });

    // Fetch candidate + job
    const candidate = await step.run("fetch-candidate", async () => {
      try {
        return await prisma.candidate.findUniqueOrThrow({
          where: { id: candidateId },
          include: { job: true },
        });
      } catch (error) {
        logger.error({ candidateId, step: "fetch-candidate", error }, "Pipeline: step failed");
        throw error;
      }
    });

    // Run AI evaluation
    const evaluated = await step.run("ai-evaluate", async () => {
      try {
        const job = candidate.job;
        const { result, promptSnapshot } = await evaluateCandidate({
          jobTitle: job?.title ?? "General Position",
          jobDescription: job?.description ?? "",
          customPrompt: job?.customPrompt ?? null,
          resumeText: candidate.resumeText,
        });
        return { result, promptSnapshot };
      } catch (error) {
        logger.error({ candidateId, step: "ai-evaluate", error }, "Pipeline: step failed");
        throw error;
      }
    });

    // Save evaluation & update status
    await step.run("save-evaluation", async () => {
      try {
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
      } catch (error) {
        logger.error({ candidateId, step: "save-evaluation", error }, "Pipeline: step failed");
        throw error;
      }
    });

    // Schedule SHORTLISTED or REJECTED notification email, delayed by the configured hours.
    // The sendDelayedStatusEmail function will cancel itself if a
    // "vekt/candidate.status.updated" event arrives before the delay elapses.
    const delaySetting = await step.run("read-email-delay-setting", async () => {
      try {
        return await prisma.setting.findUnique({ where: { key: "STATUS_EMAIL_DELAY_HOURS" } });
      } catch (error) {
        logger.warn({ candidateId, step: "read-email-delay-setting", error }, "Pipeline: could not read delay setting, using default 48h");
        return null;
      }
    });
    const delayHours = delaySetting ? parseInt(delaySetting.value, 10) : 48;

    const evaluationEmailType = meetsThreshold(evaluated.result.score, candidate.job?.threshold ?? 75)
      ? EmailType.SHORTLISTED
      : EmailType.REJECTED;
    try {
      await step.sendEvent("schedule-evaluation-email", {
        name: "vekt/candidate.status.email.scheduled",
        data: { candidateId, emailType: evaluationEmailType, delayHours },
      });
    } catch (error) {
      logger.error({ candidateId, step: "schedule-evaluation-email", error }, "Pipeline: step failed");
      throw error;
    }

    await step.run("log-pipeline-complete", async () => {
      logger.info({ candidateId, score: evaluated.result.score, status: evaluationEmailType }, "Pipeline: analyzeCandidate completed");
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
    retries: 3, // Max 3 attempts for delayed email
    cancelOn: [
      {
        event: "vekt/candidate.status.updated",
        match: "data.candidateId",
      },
    ],
  },
  { event: "vekt/candidate.status.email.scheduled" },
  async ({ event, step }) => {
    const { candidateId, emailType, delayHours = 48 } = event.data as {
      candidateId: string;
      emailType: EmailType;
      delayHours?: number;
    };

    if (delayHours > 0) {
      try {
        await step.sleep("wait-for-delay", `${delayHours} hours`);
      } catch (error) {
        logger.error({ candidateId, step: "wait-for-delay", error }, "Pipeline: delayed email step failed");
        throw error;
      }
    }

    await step.run("send-status-email", async () => {
      try {
        await sendCandidateEmail({ candidateId, type: emailType });
      } catch (error) {
        logger.warn(
          { candidateId, emailType, step: "send-status-email", error },
          "Pipeline: status email failed — skipping",
        );
      }
    });
  },
);

/** Inngest cron function: delete candidate records (+ resume files) past the retention window */
export const purgeExpiredCandidates = inngest.createFunction(
  { id: "purge-expired-candidates", retries: 2 }, // Max 2 attempts for daily purge
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
          try {
            await sendCandidateEmail({ candidateId: c.id, type: EmailType.DATA_RETENTION_WARNING });
            warned++;
          } catch (error) {
            logger.warn({ candidateId: c.id, error }, "Purge: retention warning email failed — skipping candidate");
          }
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

  try {
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
  } catch (error) {
    logger.error({ candidateId, error }, "Pipeline: direct evaluation failed");
    throw error;
  }
}
